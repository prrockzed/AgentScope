import ast
from typing import Any

from app.tools.base import BaseTool

_ALLOWED_NODE_TYPES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Constant,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Pow,
    ast.Mod,
    ast.USub,
    ast.UAdd,
)


def _safe_eval(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return float(node.value)
        raise ValueError(f"Unsupported constant type: {type(node.value)}")
    if isinstance(node, ast.BinOp):
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        op = node.op
        if isinstance(op, ast.Add):
            return left + right
        if isinstance(op, ast.Sub):
            return left - right
        if isinstance(op, ast.Mult):
            return left * right
        if isinstance(op, ast.Div):
            if right == 0:
                raise ValueError("Division by zero")
            return left / right
        if isinstance(op, ast.Pow):
            return left ** right
        if isinstance(op, ast.Mod):
            if right == 0:
                raise ValueError("Modulo by zero")
            return left % right
        raise ValueError(f"Unsupported operator: {type(op)}")
    if isinstance(node, ast.UnaryOp):
        operand = _safe_eval(node.operand)
        if isinstance(node.op, ast.USub):
            return -operand
        if isinstance(node.op, ast.UAdd):
            return operand
        raise ValueError(f"Unsupported unary operator: {type(node.op)}")
    raise ValueError(f"Unsupported expression node: {type(node)}")


def _validate_nodes(node: ast.AST) -> None:
    if not isinstance(node, _ALLOWED_NODE_TYPES):
        raise ValueError(f"Expression contains disallowed construct: {type(node).__name__}")
    for child in ast.iter_child_nodes(node):
        _validate_nodes(child)


class CalculatorTool(BaseTool):
    @property
    def name(self) -> str:
        return "calculator"

    @property
    def description(self) -> str:
        return (
            "Evaluates a mathematical expression. "
            "Supported operators: +, -, *, /, **, %. "
            "Input: {'expression': '<math expression string>'}"
        )

    def run(self, **kwargs: Any) -> str:
        expression: str = kwargs.get("expression", "")
        if not expression or not expression.strip():
            raise ValueError("expression must not be empty")

        try:
            tree = ast.parse(expression.strip(), mode="eval")
        except SyntaxError as exc:
            raise ValueError(f"Invalid expression syntax: {exc}") from exc

        _validate_nodes(tree)
        result = _safe_eval(tree)

        # Return integer representation when result is whole number
        if result == int(result):
            return str(int(result))
        return str(result)
