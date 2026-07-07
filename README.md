This is a code challenge where I am being tested for my way of approaching the problem.
I am diving this in these sections ["My way of thinking", "IA generated docs", "Up and running"]

For logical reasons I am not revealing client, challenge and the example I got via e-mail

# My way of thiking

## Questions I asked:
1. What kind of database should I use?
2. I need to create a CRUD, also I need to the ablity a bulk-import/create from csv, how should I implement the bulk? I am using a csv file that I open it on Monday July 6th 2026
3. How should I stor the data from the csv file so I can standardize it? 
3.1. I need to make a clean up over the file, there are some empty rows that can be removed
3.2. Can I use a varchar field on the first fields? (name, sku, description, category)
3.3. I noticed that in the price field, there is some data that I can not threat as numbers (free), So I need to standardize it, and just change all of them to 0, also I am planning on convert the floating numbers to cents, so i can threat them in a better way and without handing the common floating/double problems 
3.4. for stock I realized there are some negative numbers, what does this means? 
3.5. for weight I am also changing it to grams (similar to point 3.3) to avoid precision errors
3.6 how should I handle duplicated SKUs?
3.7 what should we do with products without Name? I am thiking that we might want to have a way to publish, if there is something missing just do not publish it, if not published we need to have an error message at row level so we can know that is missing
3.8 if the weight is missing, what could happens? Right now, I think that nothing, but given that is an ecommerce, we might want to handle also shipping at some point
4. For categories, I want to normalize that field so, I am going to first check if the category exists if not create them. then store all the products
5. how am I going to fake the payment? I could integrate an easy stripe checkout proceses, but I am skiping it due time + the challenge says I can just fake it.
5.1 Something important for the payments is that it needs to be a transaction
6. The UI required is really simple and limited, I want to add at least a simple register, login and session management so we can know who buy what
7. The user needs to be able to search (we need to add good indexes at db level, pagination for client-server)
8. what do we need In order to be enterprise level?

## initial architecture proposal
1. In local there is not much to attach, It could be a simple client-server pattern with a sql db
2. For prod, there are some challenges that we could need to attach once deployed (what we need to have the best availability?, are there some resources we could catch to improve performance? how do we escalate db and backend services?, how do we serve the client?)
3. for the CSV import the pipeline should be close to: Upload -> Parse -> Clean -> Validate -> Normalize -> Report (mostly errors) -> Insert/create
4. In the purchase process, the pipeline/transactions should be: Product exsitance -> Verify Stock -> Create Order(purchase) -> Add Items -> verify payment -> decrement stock

## technologies
1. postgres
2. next Js (under vercel or aws amplify)
3. Prisma for DB management
4. Docker (compse for local)

## Steps to start
1. Create repo in gh
2. Init IA agent (I am using codex for this purpose)
3. Add challenge content to git ignore, so I am not exposing the challenge nor the example
4. based on the challenge and the questions I made, create a Plan with codex
5. Implement plan
6. Manual QA + create automated tests

## Future concerns
1. Caching, indexing, how is the performance going to looks like in the future, once it is running in a prod env?
2. What kind of observability should? we have maybe require data dog or new relic?
3.  

# IA generated docs

# Up and running