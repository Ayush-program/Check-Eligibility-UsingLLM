from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EligibilityResult:
    score: int
    eligibility_level: str
    checks: List[Dict[str, str]]
    reasons: List[str]
    passed: bool
    classification_check: Dict[str, Any]


class EligibilityChecker:
    """Main eligibility checking logic with dynamic field handling"""
    
    def __init__(self):
        self.score_weights = {
            "turnover": 20,
            "oem_turnover": 20,
            "experience": 20,
            "past_performance": 20,
            "documents": 20
        }
    
    def check_eligibility(self, company: Dict[str, Any], tender: Dict[str, Any]) -> EligibilityResult:
        """Check if company is eligible for tender"""
        
        score = 0
        checks = []
        reasons = []
        total_possible_score = 0  # Track total possible score
        
        # Get classification level from tender
        classification_level = tender.get("classification_level", "UNIVERSAL")
        
        # Check classification eligibility first
        classification_passed, classification_reason, classification_data = self._check_classification_eligibility(
            classification_level, company
        )
        
        if not classification_passed:
            checks.append({
                "field": "classification",
                "status": "failed",
                "message": classification_reason
            })
            reasons.append(classification_reason)
            
            return EligibilityResult(
                score=0,
                eligibility_level="Not Eligible",
                checks=checks,
                reasons=reasons,
                passed=False,
                classification_check={
                    "passed": False,
                    "level": classification_level,
                    "reason": classification_reason
                }
            )
        
        checks.append({
            "field": "classification",
            "status": "passed",
            "message": classification_reason
        })
        
        # Get exemption status
        # Company inputs
        is_mse = company.get("mse_status") == "Yes"
        is_startup = company.get("startup_status") == "Yes"

        # Tender rules
        tender_allows_mse = tender.get("mse_status") == "Yes"
        tender_allows_startup = tender.get("startup_status") == "Yes"

        # Validate exemptions strictly
        valid_mse = is_mse and tender_allows_mse
        valid_startup = is_startup and tender_allows_startup

        has_exemption = valid_mse or valid_startup

        # 🔥 Add warnings (important)
        if is_mse and not tender_allows_mse:
            reasons.append("❌ MSE exemption not allowed in this tender")

        if is_startup and not tender_allows_startup:
            reasons.append("❌ Startup exemption not allowed in this tender")

        # Optional strict override (recommended)
        if not tender_allows_mse:
            is_mse = False

        if not tender_allows_startup:
            is_startup = False
        
        logger.info(f"Company Status - MSE: {is_mse}, Startup: {is_startup}, Has Exemption: {has_exemption}")
        
        # Check Turnover - ONLY if required in tender
        if tender.get("turnover") and tender.get("turnover") > 0:
            total_possible_score += self.score_weights["turnover"]
            score += self._check_turnover_with_exemption(
                tender.get("turnover"), 
                company.get("turnover", 0),
                has_exemption,
                checks, 
                reasons
            )
        else:
            # No turnover requirement - automatically pass
            checks.append({
                "field": "turnover",
                "status": "not_required",
                "message": "No turnover requirement in this tender"
            })
        
        # Check OEM Turnover - ONLY if required in tender
        if tender.get("oem_turnover") and tender.get("oem_turnover") > 0:
            total_possible_score += self.score_weights["oem_turnover"]
            score += self._check_criterion(
                "oem_turnover", 
                tender.get("oem_turnover"), 
                company.get("oem_turnover", 0),
                False,
                checks, 
                reasons
            )
        else:
            checks.append({
                "field": "oem_turnover",
                "status": "not_required",
                "message": "No OEM turnover requirement in this tender"
            })
        
        # Check Experience - ONLY if required in tender
        if tender.get("experience") and tender.get("experience") > 0:
            total_possible_score += self.score_weights["experience"]
            score += self._check_experience_with_exemption(
                tender.get("experience"), 
                company.get("experience", 0),
                has_exemption,
                checks, 
                reasons
            )
        else:
            checks.append({
                "field": "experience",
                "status": "not_required",
                "message": "No experience requirement in this tender"
            })
        
        # Check Past Performance - ONLY if required in tender
        if tender.get("past_performance") and tender.get("past_performance") > 0:
            total_possible_score += self.score_weights["past_performance"]
            score += self._check_criterion(
                "past_performance", 
                tender.get("past_performance"), 
                company.get("past_performance", 0),
                False,
                checks, 
                reasons
            )
        else:
            checks.append({
                "field": "past_performance",
                "status": "not_required",
                "message": "No past performance requirement in this tender"
            })
        
        # Check Documents (Basic Documents are ALWAYS required)
        total_possible_score += self.score_weights["documents"]
        score += self._check_documents(tender, company, checks, reasons)
        
        # Check for core failures (failing a requirement completely)
        has_core_failure = any(c.get("status") == "failed" for c in checks if c.get("field") != "classification")
        
        # Calculate base probability score from core requirements (Turnover, Experience, etc.)
        if total_possible_score > 0:
            percentage_score = (score / total_possible_score) * 100
        else:
            percentage_score = 100.0
            
        # Every document is important! We scale the overall probability by the fraction of documents provided.
        doc_check = next((c for c in checks if c.get("field") == "documents"), None)
        if doc_check and doc_check.get("total", 0) > 0:
            provided = doc_check.get("provided", 0)
            total = doc_check.get("total", 1)
            doc_ratio = provided / total
            
            # Scale the final probability down proportional to missing documents
            percentage_score = percentage_score * doc_ratio
            
            if provided < total:
                reasons.append(f"⚠️ Eligibility reduced: Only provided {provided} out of {total} required documents.")

        percentage_score = int(percentage_score)

        # Apply AI-like Probability Logic
        if has_core_failure:
            passed = False
            # Core requirements unmet -> instant fail
            percentage_score = min(percentage_score, 49)
            reasons.append("⚠️ Disqualified: A core mandatory requirement is completely unmet.")
        else:
            passed = percentage_score >= 50

        # Strict level assignment based on AI Logic
        if percentage_score == 100:
            level = "Eligible"
        elif percentage_score >= 50:
            level = "Low Eligibility"
        else:
            level = "Not Eligible"
            passed = False
        
        logger.info(f"Score: {score}/{total_possible_score} = {percentage_score}%")
        
        return EligibilityResult(
            score=percentage_score,
            eligibility_level=level,
            checks=checks,
            reasons=reasons,
            passed=passed,
            classification_check={
                "passed": True,
                "level": classification_level,
                "reason": classification_reason
            }
        )
    
    def _check_classification_eligibility(self, level: str, company: Dict[str, Any]) -> tuple:
        """Check classification eligibility"""
        
        if level == "Q1":
            return False, "❌ Q1 bidding is exclusive, making it restricted to the OEM only, often leading to lower participation or no bids if that specific manufacturer does not submit a proposal.", {}
        
        elif level == "Q2":
            has_authorization = company.get("oem_authorization") == "Yes"
            
            if has_authorization:
                return True, "✅ Q2 Tender: OEM Authorization verified. Proceeding with eligibility check.", {}
            else:
                return False, "❌ Q2 (Quadrant 2) tenders are designed specifically for branded products where the Original Equipment Manufacturer (OEM) controls the catalog, and only authorized resellers are allowed to participate.", {}
        
        elif level in ["Q3", "Q4"]:
            return True, f"✅ {level} Tender: No restrictions. All suppliers are eligible to participate.", {}
        
        else:
            return True, "✅ Universal Tender: No classification restrictions. All suppliers are eligible.", {}
    
    def _check_turnover_with_exemption(self, required, actual, has_exemption, checks, reasons):
        if required is None or required == 0:
            return 0

        weight = self.score_weights["turnover"]

        if has_exemption:
            checks.append({
                "field": "turnover",
                "status": "exempted",
                "message": f"Exemption applied (Valid). Required: ₹{required:,}, Actual: ₹{actual:,}"
            })
            return weight

        if actual >= required:
            checks.append({"field": "turnover", "status": "passed"})
            return weight
        else:
            checks.append({"field": "turnover", "status": "failed"})
            reasons.append(f"Turnover: Required ₹{required:,}, but got ₹{actual:,}")
            return 0
    
    def _check_experience_with_exemption(self, required, actual, has_exemption, checks, reasons):
        if required is None or required == 0:
            return 0

        weight = self.score_weights["experience"]

        if has_exemption:
            checks.append({
                "field": "experience",
                "status": "exempted",
                "message": f"Exemption applied (Valid). Required: {required} years, Actual: {actual} years"
            })
            return weight

        if actual >= required:
            checks.append({"field": "experience", "status": "passed"})
            return weight
        else:
            checks.append({"field": "experience", "status": "failed"})
            reasons.append(f"Experience: Required {required} years, but got {actual} years")
            return 0
    
    def _check_criterion(self, field: str, required: Optional[int], 
                        actual: int, exempt: bool, checks: List, 
                        reasons: List) -> int:
        """Check a single criterion"""
        
        if required is None or required == 0:
            return 0
        
        weight = self.score_weights.get(field, 20)
        
        if actual >= required:
            checks.append({"field": field, "status": "passed"})
            return weight
        elif exempt:
            checks.append({"field": field, "status": "exempted"})
            return weight // 2
        else:
            checks.append({"field": field, "status": "failed"})
            reasons.append(f"{field}: Required {required}, got {actual}")
            return 0
    
    def _check_documents(self, tender: Dict, company: Dict, 
                         checks: List, reasons: List) -> int:
        """Check document requirements using sectionwise data and mandatory basic docs"""
        
        documents_by_section = tender.get("documents_by_section", {})
        
        # Basic documents are globally mandatory
        basic_docs = [
            "PAN Card", "GST Certificate", "MSME / Udyam Registration Certificate", 
            "Cancelled Cheque / Bank Account Proof", "CA Certificate for Turnover"
        ]
        
        # Flatten all required documents from across all sections
        required_docs = list(basic_docs)
        
        if documents_by_section:
            for section, docs in documents_by_section.items():
                if docs:
                    required_docs.extend(docs)
        
        company_docs = [d.lower() for d in company.get("documents", [])]
        
        missing_docs = []
        for doc in required_docs:
            if not any(doc.lower() in c.lower() for c in company_docs):
                missing_docs.append(doc)
        
        total_required = len(required_docs)
        provided_docs = total_required - len(missing_docs)
        
        if missing_docs:
            reasons.append(f"Missing documents ({len(missing_docs)}/{total_required}): {', '.join(missing_docs)}")
            if provided_docs > 0:
                checks.append({
                    "field": "documents", 
                    "status": "partial",
                    "provided": provided_docs,
                    "total": total_required
                })
            else:
                checks.append({
                    "field": "documents", 
                    "status": "failed",
                    "provided": 0,
                    "total": total_required
                })
                
            return int((provided_docs / total_required) * self.score_weights["documents"])
        else:
            checks.append({
                "field": "documents", 
                "status": "passed",
                "provided": total_required,
                "total": total_required
            })
            return self.score_weights["documents"]
    
    def _get_eligibility_level(self, score: int) -> str:
        """Get eligibility level based on probability score (Not heavily used anymore since level is mapped in main check, but kept for compatibility)"""
        if score == 100:
            return "Eligible"
        elif score >= 50:
            return "Low Eligibility"
        else:
            return "Not Eligible"


def check_eligibility(company: Dict[str, Any], tender: Dict[str, Any]) -> Dict[str, Any]:
    """Wrapper function for backward compatibility"""
    checker = EligibilityChecker()
    result = checker.check_eligibility(company, tender)
    return {
        "score": result.score,
        "eligibility_level": result.eligibility_level,
        "checks": result.checks,
        "reasons": result.reasons,
        "passed": result.passed,
        "classification_check": result.classification_check
    }