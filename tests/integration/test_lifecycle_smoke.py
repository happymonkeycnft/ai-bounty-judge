"""Network-backed deterministic lifecycle smoke test (GLSim/local Studio)."""

import json
import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded
from gltest.validators import get_validator_factory


@pytest.mark.integration
def test_create_submit_finalize_smoke(accounts):
    factory = get_contract_factory("AIBountyJudge")
    creator_contract = factory.deploy(account=accounts[0])

    created = creator_contract.create_bounty(
        args=[
            "Verify the Example Domain reference page",
            "Submit the stable public reference page.",
            [
                "The main heading says Example Domain.",
                "The page explains its illustrative purpose.",
                "The page states that the domain may be used in documentation without prior coordination or permission.",
            ],
            [],
        ]
    ).transact()
    assert tx_execution_succeeded(created)
    assert int(creator_contract.get_bounty_count(args=[]).call()) == 1

    participant_contract = factory.build_contract(
        creator_contract.address, account=accounts[1]
    )
    saved = participant_contract.save_submission(
        args=[1, "https://example.com", "", "Official example page."]
    ).transact()
    assert tx_execution_succeeded(saved)
    finalized = participant_contract.finalize_submission(args=[1]).transact()
    assert tx_execution_succeeded(finalized)
    assert creator_contract.get_bounty(args=[1]).call()["status"] == "SUBMITTED"


@pytest.mark.integration
def test_five_validator_review_happy_path(accounts):
    factory = get_contract_factory("AIBountyJudge")
    creator = factory.deploy(account=accounts[0])
    assert tx_execution_succeeded(
        creator.create_bounty(
            args=[
                "Verify the Example Domain reference page",
                "Submit the stable public reference page.",
                [
                    "The main heading says Example Domain.",
                    "The page explains its illustrative purpose.",
                    "The page states that the domain may be used in documentation without prior coordination or permission.",
                ],
                [],
            ]
        ).transact()
    )
    participant = factory.build_contract(creator.address, account=accounts[1])
    assert tx_execution_succeeded(
        participant.save_submission(
            args=[1, "https://example.com", "", "Official example page."]
        ).transact()
    )
    assert tx_execution_succeeded(participant.finalize_submission(args=[1]).transact())

    llm_json = json.dumps(
        {
            "criteria": [
                {"id": 1, "result": "PASS", "reason": "Heading matches."},
                {"id": 2, "result": "PASS", "reason": "Purpose is stated."},
                {"id": 3, "result": "PASS", "reason": "Permission-free documentation use is stated."},
            ],
            "summary": "All criteria are established by the retrieved page.",
        }
    )
    validator_factory = get_validator_factory()
    validators = validator_factory.batch_create_mock_validators(
        5,
        mock_llm_response={
            "nondet_exec_prompt": {"Judge each criterion": llm_json},
            "eq_principle_prompt_comparative": {},
            "eq_principle_prompt_non_comparative": {},
        },
        mock_web_response={
            "nondet_web_request": {
                "https://example.com": {
                    "method": "GET",
                    "status": 200,
                    "body": "Example Domain. This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.",
                }
            }
        },
    )
    review = creator.review_submission(args=[1]).transact(
        transaction_context={"validators": [v.to_dict() for v in validators]},
        consensus_max_rotations=0,
    )
    assert tx_execution_succeeded(review)
    accepted = creator.get_review(args=[1]).call()
    assert accepted["overall"] == "APPROVED"
    assert accepted["accepted"] is True
