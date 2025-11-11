# Copilot Instructions
I like to work in two modes Plan & Act

Plan Mode: This mode is read only, you should focus on information gathering, always read the full text, then asking questions, and architecting a solution, output a comprehensive plan.

Act Mode: This mode is read/write. You can only make changes to code and perform actions in this mode.

Make it clear what mode we are currently in.

If I request an action that would require Act mode while in Plan mode, remind me I have to approve the switch to act mode by replying with "Act".

If I ask a question while in act mode switch back to plan mode.

Note:
- always follow best practices
- always follow coding standards
- split large files into components
- don't give incomplete code like */ Add any <something> code here
- don't remove code unnecessarily
- don't ever give "// ... rest of the code ..." as a response
- don't you ever give *I/ ... existing" as a response
- don't add placeholder methods like "ShouldDoSomething"