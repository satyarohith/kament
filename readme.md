# Kament

Kament is a basic commenting system for static sites. It uses FaunaDB and runs
on Deploy.

Features offered by Kament:

- Serverless. Runs only when someone makes a request.
- Data stays on your own accounts.
- Login with GitHub - reduces spam to a good extent.
- Supports markdown formatting.

To use Kament on your site, you need to first deploy the **Kament API** and then
embed the **Kament Client** script on your site. The embeded script will
communicate with the API to make comments happen. The following sections will
detail the steps required to deploy and embed Kament on your site.

- [Deploy Kament API](#deploy-kament-api)
- [Embed Kament on a Website](#embed-kament-on-a-website)

## Deploy Kament API

We use Fauna to store the comments and user data. And GitHub for login facility.
So in addition to deploying the API on Deploy, we need to acquire some
credentials from both the platforms.

Our aim in the coming sections is to gather values for the following secrets
that we will create on Deploy.

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `FAUNA_SECRET`
- `JWT_SIGNING_SECRET`

**Fauna**

1. Create an account on Fauna.com and a database (name it anything but `kament`
   would be a good choice).
2. Import the schema available at [`db/schema.gql`](db/schema.gql) by
   downloading it and uploading it on Fauna Dashboard of the just created
   database.
3. After import, go to Security section and create a new key with "Server" role.
4. Grab the value and create a file named secrets.txt and paste the value
   corresponding to the key name (`FAUNA_SECRET`). Use this method to store
   values until we reach to the Deploy step.

<!-- 4. Copy the secret and create a secret named `FAUNA_SECRET` in  -->

**GitHub**

1. Go to https://github.com/settings/applications/new and fill the form to
   create a new oAuth application. Choose the callback url same as the website
   url you're going to embed Kament on.
2. After successful creation, you'll be routed to the application page and
   presented with Client Id and a button to generate a new client secret.
3. Grab the client Id and create a secret named `GITHUB_CLIENT_ID` with the ID.
   Click on "generate client secret" and grab the presented value to create a
   secret named `GITHUB_CLIENT_SECRET`.

The Client ID is used in the Kament's client side script to initiate auth flow
when a new user tries to comment.

And now you have only one secret left to fill out: `JWT_SIGNING_SECRET`. Create
a random string that includes wide variety of characters.

**Deploy**

TODO

## Embed Kament on a Website

TODO
