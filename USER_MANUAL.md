
📘 FinModel App — User Manual & Logic Guide (v1.0)
Table of Contents
General Concepts
Component 1: Project Info & S-Curve
Component 2: Development Costs
Component 3: Sales & Inflows
Component 4: Financing Wizard
Preview & Outputs
Troubleshooting & Common Issues
1. General Concepts
Q: What is the "Funding Gap"?
A: The Funding Gap represents the maximum cumulative cash shortfall during construction before debt drawdowns are applied. It visualizes the peak amount of cash the developer must have available (or raise) to keep the project moving before the bank reimburses costs.
Q: What is the difference between "Static" and "Dynamic" Equity?
A:
Static Equity: A simple calculation: TDC - Max Debt. It assumes you fund everything upfront.
Dynamic Equity (Peak Equity Required): The actual maximum cash outflow at any single point in time, accounting for the timing of debt drawdowns and sales inflows. This is almost always lower than Static Equity.
2. Component 1: Project Info & S-Curve
Q: How is the "First Milestone Month" determined?
A: It is calculated automatically based on your Construction Cost S-Curve (from Component 2).
If you select "30% Progress" as the first milestone, the app sums your monthly construction costs until 30% of the total is reached.
Example: If 30% of costs are spent by Month 10, the First Milestone Month is auto-filled as M10.
3. Component 2: Development Costs
Q: How are Buyer Down Payments treated?
A:
Buyer Down Payment (10-20%): Goes 100% Direct to Developer. It is not put into escrow. It can be used immediately to fund construction costs or reduce equity requirements.
Construction Milestone Payments (60-70%): Goes into Escrow (80% Escrow / 20% Direct to Developer, typically).
Handover Payments: Goes into Escrow (released per waterfall rules).
4. Component 3: Sales & Inflows
Q: What is the difference between "Bank Submission" and "Full Transaction" Escrow Models?
A:
Bank Submission (Simplified): Assumes sales proceeds repay debt first (e.g., 100% to debt service). Good for initial feasibility.
Full Transaction (Detailed): Models the real escrow waterfall:
Pay Debt Service (Interest + Principal)
Pay Remaining Construction Costs
Top-up Reserve Account (e.g., 6 months debt service)
Release excess to Developer (only if Pre-Sale Threshold > 70% and LTV < 60%).
5. Component 4: Financing Wizard
Step 1: Project Summary
Layout: Shows GDV, Land Costs, Construction Costs, Soft Costs, POWC, TDC, and Construction Period.
Funding Gap Visualization - Preliminary: A bar chart showing TDC vs. Max Debt vs. Min Equity.
Step 2: Land Financing
Q: What does "Land Equity Contribution %" do?
A: It determines how much of the Land Cost is paid by the developer vs. refinanced by the bank.
100% Equity: Developer pays full land cost at M0. Bank draws AED 0 for land.
40% Equity: Developer pays 40% at M0. Bank refinances the remaining 60% (drawn at first milestone, M10).
0% Equity: Bank refinances 100% of land cost (drawn at first milestone, M10).
Q: What does "Integrate remaining land costs into main facility" do?
A:
ON (Recommended): Land refinance is included in the main loan's LTC/LTV calculation. Single facility, single covenant.
OFF: Land refinance is treated as a separate obligation (excluded from LTC base). Rarely used.
Step 3: Debt Facility Settings
Q: What is the Commitment Fee?
A: A fee paid to the bank on the undrawn portion of the facility. It compensates the bank for keeping the money available for you.
Formula: (Undrawn Balance) × (Commitment Fee %) × (Time).
Step 4: Drawdown Structure (CRITICAL)
Q: What is the difference between "30/70 Milestone" and "Equity-First Gap-Fill"?
A:
Feature
30/70 Milestone Reimbursement
Equity-First Gap-Fill
Trigger
Progress Milestones (e.g., M10, M18, M25)
Funding Gap (Costs > Equity + Sales)
M0 Drawdown
AED 0 (Always)
Can be > 0 (if equity threshold reached)
Land Refinance
Drawn at First Milestone (M10)
Can be drawn at M0
Split
Fixed 70% Bank / 30% Developer
Varies by month based on equity capacity
Use Case
Standard Bank Terms (GCC/Middle East)
Flexible Internal Modeling
Q: How does the "Hybrid" Milestone Logic work?
A:
User selects Progress Threshold (e.g., 30%).
App calculates Estimated Month from S-Curve (e.g., M10).
User selects Certification Interval (e.g., 3 months).
Drawdown Month = MAX(Estimated Month, Certification Month).
Example: If 30% is reached at M10, but bank only certifies quarterly at M12, drawdown happens at M12.
Q: Why is there NO debt drawdown at M0 in 30/70 mode?
A: In the 30/70 Milestone model, ALL drawdowns (including land refinance) occur at progress milestones (M10+), never at M0. This matches bank certification practice where banks don't lend against "planned" costs, only "certified" progress.
Step 5: Interest & IDC
Q: What is IDC (Interest During Construction)?
A: Interest that accrues on drawn debt during the construction phase.
Capitalized: Added to the loan balance (you don't pay cash now, but owe more later).
Current: Paid in cash monthly (rare for development projects with no income).
Step 6: Repayment Structure
Q: What is a "Bullet" repayment?
A: You pay only interest during the loan term. The full principal is due in one lump sum at maturity (e.g., M48).
Warning: If your projection ends at M36, you won't see the principal repayment, which inflates your IRR. Always extend projection to maturity for Bullet loans.
Step 7: Escrow & Sales Proceeds
Q: What does "Sales Reduce Equity Requirement" do?
A:
ON: Sales inflows during construction reduce the amount of equity you need to inject. This lowers "Peak Equity."
OFF: Equity funds costs regardless of sales. Sales proceeds are treated as cash inflows but don't reduce the equity funding need (conservative view).
6. Preview & Outputs
Q: What is "Debt Service"?
A: The total cash outflow to the bank in a given month.
Formula: Interest Expense + Principal Repayment.
Note: During construction, this is often just Interest (if IDC is capitalized). Post-construction, it includes Principal.
Q: What is "Net Financing"?
A: The net cash impact of financing activities.
Formula: Debt Drawdown (Inflow) - Debt Service (Outflow) - Commitment Fees (Outflow).
Positive: Bank gave you more cash than you paid them (e.g., at a milestone drawdown).
Negative: You paid the bank more than you received (e.g., during repayment phase).
Q: Why are "Interest" and "Principal" shown separately now?
A: For clarity. "Debt Service" lumps them together. Splitting them allows you to see:
Interest Payment (Red): The cost of borrowing (P&L impact).
Principal Repayment (Amber): The reduction of debt (Balance Sheet impact).
Q: Why is my IRR so high (e.g., 132%)?
A: Likely because you are using a Bullet Repayment structure, but your projection ends before the bullet payment is due.
Fix: Extend the projection to the loan maturity date (e.g., M48) to capture the principal repayment. This will normalize the IRR to a realistic ~30-45%.
7. Troubleshooting & Common Issues
Issue
Cause
Solution
M0 Debt Drawdown is > 0 in 30/70 Mode
Bug or "Equity-First" toggle still ON.
Ensure "Drawdown Model" is set to "30/70 Milestone". M0 Debt should always be 0 in this mode.
M10 Debt Drawdown is the same for all Land Equity %
landCost variable was overwritten to 0.
Hard refresh (Cmd+Shift+R). Ensure cashOutflows.landCost is always 5,000,000 regardless of equity %.
Land Refinance not appearing at M10
Logic error in isFirstProgressMilestone.
Check console logs for "M10 Land Refinance Calculation". Ensure landRefinanceAmount > 0.
Toggle "Integrate Land Costs" won't switch OFF
Store binding issue.
Ensure financing.landRefinanceIntoMain is properly bound in the checkbox onChange.
Duplicate Navigation Buttons
UI copy-paste error.
Remove the navigation block appearing before the content cards in Step 2. Keep only the bottom one.
