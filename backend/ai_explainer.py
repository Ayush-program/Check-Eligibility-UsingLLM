from typing import Dict, Any, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIExplainer:
    """AI-powered explanation generator"""
    
    def generate_explanation(self, result, tender, company):
        if isinstance(result, dict):
            reasons = result.get("reasons", [])
            checks = result.get("checks", [])
            score = result.get("score", 0)
        else:
            reasons = getattr(result, "reasons", [])
            checks = getattr(result, "checks", [])
            score = getattr(result, "score", 0)

        explanation = []
        suggestions = []

        # Score based analysis
        if score == 100:
            explanation = [
                "🎉 Perfect score! Your company meets all eligibility criteria.",
                "✅ All requirements are satisfied.",
                "🏆 You are in an excellent position to win this tender."
            ]
            suggestions = [
                "Prepare your bid documents carefully.",
                "Review technical specifications before submission.",
                "Consider competitive pricing strategy.",
                "Ensure all documents are properly formatted."
            ]
        
        elif score >= 80:
            explanation = [
                "🎯 Good score! Your company is highly eligible.",
                "📊 Most requirements are met successfully.",
                "⭐ Minor improvements can make you fully eligible."
            ]
            suggestions = [
                "Review the failed criteria and address them.",
                "Double-check document requirements.",
                "Verify all numbers entered are correct.",
                "Consider getting MSE/Startup registration if applicable."
            ]
        
        elif score >= 50:
            explanation = [
                "⚠️ Medium eligibility score.",
                "📉 Some key requirements are not met.",
                "🔧 Improvements needed in specific areas."
            ]
            suggestions = [
                "Focus on improving the failed criteria.",
                "Check if you qualify for MSE/Startup exemptions.",
                "Ensure all required documents are uploaded.",
                "Consider partnering with eligible companies."
            ]
        
        else:
            explanation = [
                "❌ Low eligibility score.",
                "🚫 Multiple requirements not satisfied.",
                "📋 Significant improvements needed."
            ]
            suggestions = [
                "Review all requirements carefully.",
                "Check if you qualify for any exemptions.",
                "Consider applying for MSE/Startup registration.",
                "Build experience by participating in smaller tenders.",
                "Improve financial turnover and past performance."
            ]
        
        # Add specific reasons from checks
        for check in checks:
            if check["status"] == "failed":
                field = check["field"].replace("_", " ").upper()
                explanation.append(f"❌ {field}: {check.get('message', 'Requirement not met')}")
                suggestions.append(f"🔧 Address {field} requirement")
        
        for reason in reasons:
            if "Missing documents" in reason:
                explanation.append(f"📄 {reason}")
                suggestions.append("📄 Upload all required documents")
        
        return {
            "explanation": explanation[:8],  # Limit to 8 items
            "suggestions": suggestions[:6]   # Limit to 6 items
        }