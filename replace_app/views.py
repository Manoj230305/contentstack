from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import google.generativeai as genai

# Configure your Gemini API key here
genai.configure(api_key="AIzaSyAOCr5H0qZq98Cbb5tuUDQ1mxmdBPdb4g0")  

@csrf_exempt
def smart_context_replace(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)
    try:
        data = json.loads(request.body)
        content = data.get("content")
        find = data.get("find")
        replace = data.get("replace")
        replaceAll = data.get("replaceAll", "false")

        if not all([content, find, replace]):
            return JsonResponse(
                {"error": "Content, find, and replace are required."}, status=400
            )

        prompt = (
            f"You are a smart editor. In the following content:\n"
            f"{content}\n"
            f"Replace {'every occurrence' if replaceAll else 'only the first occurrence'} of '{find}' with '{replace}', "
            f"ensuring replacements fit the context and meaning. "
            f"Update link texts and URLs too, if any. Return only the fully rephrased output. "
            f"If I tell something, you should understand the meaning and make the context correct. If it is wrong then just change it."
        )

        print(prompt)

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return JsonResponse({"original": content, "rephrased": response.text})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
