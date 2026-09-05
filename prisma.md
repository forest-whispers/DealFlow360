- npm install prisma --save-dev => CLI
- npm install @prisma/client => production client, querying your database => fascilates migrations, auto suggestions
- npm install prisma@6
- npm install @prisma/client@6
- npm install dotenv
- npx prisma => initialize ORM
- npx prisma init => cloud
- npx prisma init --datasource-provider postgresql  => local system, initialize standard Prisma and tell it explicitly postgres
- update database url
- provider > prisma client js
- remove output from generate client
- typescript and version 7 => remove engine=classic
- npx prisma format
- npx prisma migrate dev --name init => creates/map the database tables based on your schema
- npx prisma generate => generate prisma client
- sever
create prisma client

# notes
- run prisma generate whenever change something in prisma schema to update the prisma client(prisma generate reads the schema, brings to CL and transfers it to prisma client)
- whenever change in prisma schema, update the database schema by
prisma migrate dev or prisma db push
- relationship => deletion cascading

# model
- Model name {}
- name type constraints

# schema id
- id int @id @default(autoincrement())

# CRUD
- findunique, findmany
- ({where})
- create, createMany
- ({data:{}})
- update
- ({where}{data:{}})

# relationships
- inside model
- modelname modelref @relation(fields: [], references: [])
- foreignkey type constraint
- deletion cascading => onDelete: Cascade
- Prisma needs a declared relation field on the querying side
user => orders ORDER[]
order => userId int user User @relation(fields: [userId], references: [id], onDelete: Cascade)

# migrations
- convert ORM code to sql queries => similar to .d.ts