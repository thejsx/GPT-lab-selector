# GPT-lab-selector
This is an API that uses GPT-3.5-turbo to generate lists of lab tests for a given set of medical complaints. 
The user can click on lab tests to get a rationale for the test given the medical history/complaint. 
The labs returned are from the PPL laboratory test menu.

To run, 
1. Load the files to an IDE like Visual Studio Code
2. Install the necessary dependencies from requirements.txt
3. In the root path of the folder, add a .env file
4. In the .env file set the openai api key as:
  OPENAI_API_KEY = 'your OpenAI api key' - get this from [openai.com](https://platform.openai.com/account/api-keys)

4. from main.py in console run:
  python -m uvicorn main:app --reload
  
 5. navigate in browswer to http://127.0.0.1.8000
 6. The API interface should now be available
 
