# Kament

**WIP.** Move on.

## Secrets

The app requires you to setup these secrets

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `FAUNA_SECRET`
- `JWT_SIGNING_SECRET`

## Steps to deploy

**Fauna**

1. Create a database in fauna.
2. Import the schema present in db/schema.gql to your database using the Fauna
   dashboard.
3. After import, go to Security section and create a new key with "Server" role.
4. Copy the secret and create a secret named `FAUNA_SECRET` in Deno Dash
   dashboard.

**GitHub**

1. Go to https://github.com/settings/applications/new and fill the form to
   create a new oAuth application.
2. After successful creation, you'll be routed to the application page and
   presented with Client Id and a button to generate a new client secret.
3. Grab the client id and create a secret named `GITHUB_CLIENT_ID` with the ID.
   Click on "generate client secret" and grab the presented value to create a
   secret named `GITHUB_CLIENT_SECRET`.

The Client ID is used in the Kament's client side script to initiate auth flow
when a new user tries to comment.

And now you have only one secret left to fill out: `JWT_SIGNING_SECRET`. Create
a random string that includes wide variety of characters.
