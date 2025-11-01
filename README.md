# AI Studio Gemini App Proxy Server

This nodejs proxy server lets you run your AI Studio Gemini application unmodified, without exposing your API key in the frontend code.


## Instructions

**Prerequisites**:
- [Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)
- (Optional) Gemini API Key

1. Download or copy the files of your AI Studio app into this directory at the root level.
2. If your app calls the Gemini API, create a Secret for your API key:
     ```
     echo -n "${IA_API_KEY}" | gcloud secrets create ia_api_key --data-file=-
     ```

3.  Deploy to Cloud Run (optionally including API key):
    ```
    gcloud run deploy my-app --source=. --update-secrets=IA_API_KEY=ia_api_key:latest
    ```
