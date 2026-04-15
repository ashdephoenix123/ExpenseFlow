# AI Features for ExpenseFlow

Adding an "Ask AI" feature transforms ExpenseFlow from a simple logging tool into a personalized financial assistant.

## The "Ask AI" Feature (Chatbot / Financial Assistant)
This feature allows users to talk to their data using natural language.

**What it can do:**
*   **Data Querying:** Users can ask, *"How much did I spend on food this month?"* or *"What was my biggest expense last week?"*
*   **Comparisons:** *"How does my spending in March compare to February?"*
*   **Trend Analysis:** *"Am I spending more on transport lately?"*

**How to implement it technically:**
*   **Text-to-SQL (or Text-to-Filter):** The AI takes the user's question, translates it into a structured query (e.g., `startDate=2026-04-01`, `category=Food`), the backend fetches the data, and the AI formats the answer.
*   **RAG (Retrieval-Augmented Generation):** Fetch a summary of the user's recent transactions, feed that limited dataset into the LLM prompt as context, and let the LLM answer the user's specific question based on that context.

---

## Additional AI Features for ExpenseFlow

### 📝 1. Conversational Expense Logging (Natural Language Entry)
Instead of forcing the user to fill out a form, let them type or speak a single sentence.
*   **Example:** *"I just spent $15 on coffee at Starbucks."*
*   **AI Action:** Parses the sentence and automatically extracts `{ amount: 15, category: 'Food & Drink', merchant: 'Starbucks', date: 'Today' }`.

### 📸 2. Smart Receipt Scanning (OCR + AI)
Let users take a photo of a receipt.
*   **AI Action:** Use an AI vision model to perfectly extract the Merchant, total Amount, Tax, Date, and even itemize the receipt.

### 🤖 3. Automatic Auto-Categorization
When a user adds an expense with just a title (e.g., "Uber"), they shouldn't have to manually select the category.
*   **AI Action:** Pass the merchant name to a lightweight AI model to predict the category based on general knowledge or their past habits.

### 🔮 4. Predictive Budgeting & Forecasting
AI excels at recognizing patterns in time-series data.
*   **AI Action:** Analyze the past 3-6 months of spending to predict next month's cash flow. Warn the user if they are projected to exceed a specific budget.

### 💡 5. Proactive Insights & Financial Advice
Surface insights dynamically on the dashboard.
*   **AI Action:** Generate weekly mini-reports. *"You spent 25% more on dining out this week compared to last week. Skipping two restaurant meals next week could save you around $60."* 

### 🔄 6. Subscription & Recurring Expense Detection
Identify hidden or forgotten subscriptions.
*   **AI Action:** The AI scans for identical or similarly-priced regular charges and groups them together, alerting the user about active subscriptions.
