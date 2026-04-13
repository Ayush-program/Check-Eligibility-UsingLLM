import re
from typing import Optional, Union

def clean_text(text: Optional[str]) -> str:
    """Clean and normalize text from PDF"""
    if not text:
        return ""
    
    # Remove CID references
    text = re.sub(r'\(cid:\d+\)', '', text)
    # Remove non-ASCII characters but keep numbers and letters
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters
    text = re.sub(r'[^\w\s\.\-]', ' ', text)
    
    return text.strip().lower()

def extract_number(text: Optional[Union[str, int, float]]) -> int:
    """Extract number from text with crore/lakh handling"""
    if not text:
        return 0
    
    # Convert to string
    text = str(text).strip().lower()
    
    # Remove commas and special characters
    text = text.replace(',', '')
    text = text.replace('(', '')
    text = text.replace(')', '')
    text = text.replace('₹', '')
    text = text.replace('rs', '')
    
    # Find all numbers (including decimals)
    matches = re.findall(r'(\d+(?:\.\d+)?)', text)
    if not matches:
        return 0
    
    # Take the first number
    number = float(matches[0])
    
    # Check for multipliers (order matters - check largest first)
    if "crore" in text or "cr" in text:
        return int(number * 10000000)
    elif "lakh" in text or "lac" in text:
        return int(number * 100000)
    elif "thousand" in text or "k" in text:
        return int(number * 1000)
    
    # Check for percentage
    if "%" in text:
        return int(number)
    
    return int(number)

def format_number_for_display(number: int) -> str:
    """Format number for display (e.g., 3400000 -> 34.00 Lakh)"""
    if not number or number == 0:
        return "₹0"
    
    if number >= 10000000:
        return f"₹{(number / 10000000):.2f} Crore"
    elif number >= 100000:
        return f"₹{(number / 100000):.2f} Lakh"
    elif number >= 1000:
        return f"₹{(number / 1000):.2f} Thousand"
    else:
        return f"₹{number:,}"

def validate_and_clean_number(value: Optional[str], default: int = 0) -> int:
    """Validate and clean number input"""
    if not value:
        return default
    
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default