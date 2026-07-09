# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import re as regex_mod
from datetime import datetime


def _clean_json(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    backticks = "``" + "`"
    text = text.replace(backticks + "json", "").replace(backticks, "")
    return text.strip()


def _extract_json(text: str) -> dict:
    """Best-effort JSON extraction from LLM output."""
    text = _clean_json(text)
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass
    match = regex_mod.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass
    return {}


class AureliaOracle(gl.Contract):
    """
    Aurelia - The Golden Oracle of Web3
    AI Oracle built on GenLayer for natural language blockchain interaction.
    Uses prompt_comparative for reliable validator consensus.
    Stores results by address in TreeMap for instant reads.
    """

    owner: str

    # Keyed by address — instant read via get_analysis(address)
    analyses: TreeMap[str, str]

    # Keyed by req_id for history
    request_counter: u256
    requests: TreeMap[str, str]
    request_to_address: TreeMap[str, str]

    def __init__(self, owner_address: str):
        self.owner = owner_address
        self.request_counter = u256(0)

    # ── Write Methods ─────────────────────────────────────────────────────

    @gl.public.write
    def analyze_wallet(self, wallet_address: str, balance_data: str = "") -> str:
        """Analyze wallet activity - Use Case 1.
        Pass real balance_data from frontend: 'GEN: 42.5'"""

        balance_ctx = balance_data

        def build_prompt() -> str:
            ctx = ""
            if balance_ctx:
                ctx = (
                    f"\nREAL ON-CHAIN BALANCE DATA (from direct blockchain query):\n"
                    f"{balance_ctx}\n"
                    f"Use this REAL data as the basis for your analysis.\n"
                )
            return (
                f"You are Aurelia, an AI Oracle for blockchain analysis. "
                f"Analyze this wallet: {wallet_address}\n"
                f"{ctx}"
                f"IMPORTANT - CRITICAL RULES:\n"
                f"1. DO NOT fabricate or invent portfolio data. Only report what you can determine.\n"
                f"2. If you cannot determine actual on-chain holdings, return realistic defaults:\n"
                f"   - portfolio_value_usd: '$0.00' if no balance detected\n"
                f"   - asset_count: 0 if no assets detected\n"
                f"   - pnl_30d: '$0.00' if no transaction history\n"
                f"   - risk_level: 'Low' if no activity\n"
                f"3. Base your analysis on the REAL balance data above if provided.\n"
                f"4. Be honest - this address may have no assets or only testnet activity.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"portfolio_value_usd":"<string>","asset_count":<int>,'
                f'"pnl_30d":"<string>","risk_level":"<string>",'
                f'"summary":"<string>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"summary": "Analysis complete", "risk_level": "Medium", "asset_count": 0}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_risk = str(leader.calldata.get("risk_level", ""))
            v_risk = str(mine.get("risk_level", ""))
            if l_risk != v_risk:
                return False
            if l_risk not in ("Low", "Medium", "High"):
                return False
            l_cnt = int(leader.calldata.get("asset_count", 0))
            v_cnt = int(mine.get("asset_count", 0))
            if abs(l_cnt - v_cnt) > 2:
                return False
            l_pv = str(leader.calldata.get("portfolio_value_usd", ""))
            v_pv = str(mine.get("portfolio_value_usd", ""))
            if not l_pv or not v_pv:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"summary": "Analysis complete", "risk_level": "Medium", "asset_count": 0}

        result["analyzed_at"] = gl.message_raw["datetime"]
        result["analyzer"] = wallet_address

        self.analyses[wallet_address] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "wallet", "address": wallet_address})
        self.request_to_address[req_id] = wallet_address

        return json.dumps(result)

    @gl.public.write
    def analyze_token(self, contract_address: str) -> str:
        """Analyze token safety - Use Case 2"""

        def build_prompt() -> str:
            return (
                f"You are Aurelia, an AI Oracle for blockchain analysis. "
                f"Analyze the safety of this token contract: {contract_address}\n"
                f"Check: ownership, mint function, blacklist, liquidity, holders, honeypot.\n"
                f"Provide risk score 0-100.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"risk_score":<int>,"safety_level":"<string>",'
                f'"ownership_renounced":<bool>,"has_mint_function":<bool>,'
                f'"liquidity_locked":<bool>,"honeypot_risk":"<string>",'
                f'"warnings":[],"summary":"<string>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"risk_score": 50, "safety_level": "Unknown", "summary": "Analysis complete"}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_score = int(leader.calldata.get("risk_score", 0))
            v_score = int(mine.get("risk_score", 0))
            if abs(l_score - v_score) > 15:
                return False
            if l_score < 0 or l_score > 100:
                return False
            l_safe = str(leader.calldata.get("safety_level", ""))
            v_safe = str(mine.get("safety_level", ""))
            if not l_safe or not v_safe:
                return False
            l_own = leader.calldata.get("ownership_renounced")
            v_own = mine.get("ownership_renounced")
            if isinstance(l_own, bool) and isinstance(v_own, bool) and l_own != v_own:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"risk_score": 50, "safety_level": "Unknown", "summary": "Analysis complete"}

        result["analyzed_at"] = gl.message_raw["datetime"]
        result["analyzer"] = contract_address

        self.analyses[contract_address] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "token", "address": contract_address})
        self.request_to_address[req_id] = contract_address

        return json.dumps(result)

    @gl.public.write
    def translate_contract(self, contract_code: str) -> str:
        """Translate smart contract to plain language - Use Case 3"""
        key = "translate_" + str(self.request_counter)

        def build_prompt() -> str:
            return (
                f"You are Aurelia, an AI Oracle for blockchain analysis. "
                f"Translate this smart contract to plain language:\n"
                f"{contract_code}\n"
                f"Explain what it does, each function, security implications.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"overall_purpose":"<string>","functions":[],'
                f'"security_notes":[],"user_warnings":[]}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"overall_purpose": "Contract analysis complete", "functions": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_fn = int(len(leader.calldata.get("functions", [])))
            v_fn = int(len(mine.get("functions", [])))
            if abs(l_fn - v_fn) > 3:
                return False
            l_purpose = str(leader.calldata.get("overall_purpose", ""))
            v_purpose = str(mine.get("overall_purpose", ""))
            if len(l_purpose) < 20 or len(v_purpose) < 20:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"overall_purpose": "Contract analysis complete", "functions": []}

        result["analyzed_at"] = gl.message_raw["datetime"]

        self.analyses[key] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "translate"})
        self.request_to_address[req_id] = key

        return json.dumps(result)

    @gl.public.write
    def detect_scam(self, contract_address: str, website_url: str) -> str:
        """Detect scams - Use Case 4"""

        def build_prompt() -> str:
            return (
                f"You are Aurelia, an AI Oracle for blockchain security. "
                f"Check if this is a scam:\n"
                f"Contract: {contract_address}\n"
                f"Website: {website_url}\n"
                f"Check contract functions, domain age, wallet patterns.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"risk_level":"<string>","risk_score":<int>,'
                f'"red_flags":[],"recommendation":"<string>",'
                f'"summary":"<string>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"risk_level": "Unknown", "risk_score": 50, "summary": "Scam check complete"}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_score = int(leader.calldata.get("risk_score", 0))
            v_score = int(mine.get("risk_score", 0))
            if abs(l_score - v_score) > 15:
                return False
            if l_score < 0 or l_score > 100:
                return False
            l_risk = str(leader.calldata.get("risk_level", ""))
            v_risk = str(mine.get("risk_level", ""))
            if l_risk not in ("Low", "Medium", "High", "Critical"):
                return False
            if l_score >= 70 and l_risk == "Low":
                return False
            if l_score <= 30 and l_risk == "High":
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"risk_level": "Unknown", "risk_score": 50, "summary": "Scam check complete"}

        result["analyzed_at"] = gl.message_raw["datetime"]

        self.analyses[contract_address] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "scam", "address": contract_address, "website": website_url})
        self.request_to_address[req_id] = contract_address

        return json.dumps(result)

    @gl.public.write
    def defi_advisor(self, query: str) -> str:
        """DeFi yield advisory - Use Case 5"""
        key = "defi_" + str(self.request_counter)

        def build_prompt() -> str:
            return (
                f"You are Aurelia, an AI Oracle for DeFi analysis. "
                f"Query: {query}\n"
                f"Analyze APR, TVL, risk, protocol reputation.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"recommendations":[],"market_sentiment":"<string>",'
                f'"risk_warnings":[],"summary":"<string>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"market_sentiment": "Neutral", "summary": "DeFi analysis complete"}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_rec = int(len(leader.calldata.get("recommendations", [])))
            v_rec = int(len(mine.get("recommendations", [])))
            if abs(l_rec - v_rec) > 2:
                return False
            l_sent = str(leader.calldata.get("market_sentiment", ""))
            v_sent = str(mine.get("market_sentiment", ""))
            if not l_sent or not v_sent:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"market_sentiment": "Neutral", "summary": "DeFi analysis complete"}

        result["analyzed_at"] = gl.message_raw["datetime"]

        self.analyses[key] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "defi", "query": query})
        self.request_to_address[req_id] = key

        return json.dumps(result)

    @gl.public.write
    def interpret_governance(self, proposal_text: str) -> str:
        """Interpret governance proposals - Use Case 6"""
        key = "gov_" + str(self.request_counter)

        def build_prompt() -> str:
            return (
                f"You are Aurelia, an AI Oracle for governance analysis. "
                f"Proposal: {proposal_text}\n"
                f"Summarize, explain impact, provide voting considerations.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"proposal_summary":"<string>","key_changes":[],'
                f'"impact":{{"token_economics":"<string>","community":"<string>"}},'
                f'"risk_level":"<string>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"proposal_summary": "Governance analysis complete", "risk_level": "Low"}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_changes = int(len(leader.calldata.get("key_changes", [])))
            v_changes = int(len(mine.get("key_changes", [])))
            if abs(l_changes - v_changes) > 3:
                return False
            l_summary = str(leader.calldata.get("proposal_summary", ""))
            v_summary = str(mine.get("proposal_summary", ""))
            if len(l_summary) < 30 or len(v_summary) < 30:
                return False
            l_risk = str(leader.calldata.get("risk_level", ""))
            v_risk = str(mine.get("risk_level", ""))
            if l_risk != v_risk:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"proposal_summary": "Governance analysis complete", "risk_level": "Low"}

        result["analyzed_at"] = gl.message_raw["datetime"]

        self.analyses[key] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "governance"})
        self.request_to_address[req_id] = key

        return json.dumps(result)

    @gl.public.write
    def analyze_portfolio(self, wallet_address: str) -> str:
        """Portfolio analysis - Use Case 7"""

        def build_prompt() -> str:
            return (
                f"You are Aurelia, an AI Oracle for portfolio analysis. "
                f"Wallet: {wallet_address}\n"
                f"Provide portfolio score, allocation, strengths, weaknesses.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"portfolio_score":<int>,"total_value_usd":"<string>",'
                f'"strengths":[],"weaknesses":[],"summary":"<string>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"portfolio_score": 50, "summary": "Portfolio analysis complete"}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_score = int(leader.calldata.get("portfolio_score", 0))
            v_score = int(mine.get("portfolio_score", 0))
            if abs(l_score - v_score) > 15:
                return False
            if l_score < 0 or l_score > 100:
                return False
            l_val = str(leader.calldata.get("total_value_usd", ""))
            v_val = str(mine.get("total_value_usd", ""))
            if not l_val or not v_val:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"portfolio_score": 50, "summary": "Portfolio analysis complete"}

        result["analyzed_at"] = gl.message_raw["datetime"]
        result["analyzer"] = wallet_address

        self.analyses[wallet_address] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "portfolio", "address": wallet_address})
        self.request_to_address[req_id] = wallet_address

        return json.dumps(result)

    @gl.public.write
    def research_comparison(self, query: str) -> str:
        """Blockchain research assistant - Use Case 8"""
        key = "research_" + str(self.request_counter)

        def build_prompt() -> str:
            return (
                f"You are Aurelia, an AI Oracle for blockchain research. "
                f"Query: {query}\n"
                f"Compare on-chain metrics, ecosystem, technical differences.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"comparison":{{}},"key_changes":[],'
                f'"recommendation":"<string>","summary":"<string>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"summary": "Research complete"}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_changes = int(len(leader.calldata.get("key_changes", [])))
            v_changes = int(len(mine.get("key_changes", [])))
            if abs(l_changes - v_changes) > 3:
                return False
            l_comp = leader.calldata.get("comparison", {})
            v_comp = mine.get("comparison", {})
            if not isinstance(l_comp, dict) or not isinstance(v_comp, dict):
                return False
            if len(str(l_comp)) < 20 or len(str(v_comp)) < 20:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"summary": "Research complete"}

        result["analyzed_at"] = gl.message_raw["datetime"]

        self.analyses[key] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "research", "query": query})
        self.request_to_address[req_id] = key

        return json.dumps(result)

    @gl.public.write
    def ask_genlayer(self, query: str) -> str:
        """Answer any blockchain question - general Q&A"""
        key = "chat_" + str(self.request_counter)

        def build_prompt() -> str:
            now = gl.message_raw.get("datetime", "current date unknown")
            return (
                f"You are Aurelia, an AI Oracle specialized in blockchain and cryptocurrency. "
                f"Current date and time: {now}\n\n"
                f"CRITICAL: Always use the current date above as your reference point. "
                f"NEVER say 'as of my last knowledge update' or 'I cannot provide real-time data'. "
                f"Analyze the following question based on the current date:\n\n"
                f"{query}\n\n"
                f"Provide factual, detailed information. If the answer involves prices or market data, "
                f"provide the most recent information available and note the analysis date.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"answer":"<detailed answer>",'
                f'"topics":["<topic1>","<topic2>"],'
                f'"confidence":"<High|Medium|Low>"}}'
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"answer": "I could not process that query.", "topics": [], "confidence": "Low"}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_ans = str(leader.calldata.get("answer", ""))
            v_ans = str(mine.get("answer", ""))
            if len(l_ans) < 10 or len(v_ans) < 10:
                return False
            l_topics = leader.calldata.get("topics", [])
            v_topics = mine.get("topics", [])
            if isinstance(l_topics, list) and isinstance(v_topics, list):
                l_set = set(t.lower() if isinstance(t, str) else str(t) for t in l_topics)
                v_set = set(t.lower() if isinstance(t, str) else str(t) for t in v_topics)
                if len(l_set & v_set) == 0:
                    return False
            l_conf = str(leader.calldata.get("confidence", "")).lower()
            v_conf = str(mine.get("confidence", "")).lower()
            if l_conf not in ("high", "medium", "low") or v_conf not in ("high", "medium", "low"):
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"answer": "Analysis complete.", "topics": [], "confidence": "Medium"}

        result["analyzed_at"] = gl.message_raw["datetime"]
        result["query"] = query

        self.analyses[key] = json.dumps(result)

        req_id = str(self.request_counter)
        self.request_counter = self.request_counter + u256(1)
        self.requests[req_id] = json.dumps({"type": "chat", "query": query})
        self.request_to_address[req_id] = key

        return json.dumps(result)

    # ── View Methods (read from TreeMap — instant) ────────────────────────

    @gl.public.view
    def get_analysis(self, address: str) -> str:
        """Get stored analysis by address — instant read"""
        if address in self.analyses:
            return self.analyses[address]
        return ""

    @gl.public.view
    def get_request_count(self) -> u256:
        return self.request_counter

    @gl.public.view
    def get_request(self, req_id: str) -> str:
        """Get request by ID"""
        if req_id in self.requests:
            return self.requests[req_id]
        return "{}"

    @gl.public.view
    def get_all_analyses(self) -> str:
        """Get all stored analyses"""
        results = []
        for addr in self.analyses.keys():
            raw = self.analyses.get(addr, "")
            if raw:
                results.append(json.loads(raw))
        return json.dumps(results)
