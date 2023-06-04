from fastapi import Body, FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import openai
from dotenv import load_dotenv
import os
from fastapi.staticfiles import StaticFiles
import gpt_funcs
import labtests
from test_search import find_lab_test_matches_complete, remove_panels
from starlette.responses import Response
import models

load_dotenv()  # take environment variables from .env.
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("input.html", {"request": request})

@app.post("/process")
async def process_query(query: models.QueryData = Body(...)):
    query = query.dict()
    try:
        gpt_response = gpt_funcs.gpt_lab_recommender(query['query'])
    except Exception as e:
        print(f'The query {query} generated an error {e}')
        return {}
    try:
        final_dict,panel_dict = find_lab_test_matches_complete(gpt_response)
        panel_dict = remove_panels(query['query'], panel_dict)
    except Exception as e:
        print(f'The gpt_response {gpt_response} generated an error {e}')
        return {}
    return {'GPT tests':final_dict, 'Panels':panel_dict, 'Dicts':[labtests.test_dict['tests'],labtests.test_list]}

@app.post("/test-reasons")
async def test_query(query: str = Form(...), clickedText: str = Form(...)):
    try:
        reply = gpt_funcs.test_explanation(query,clickedText)
        # return Response(f'{clickedText}:<br/>{reply}', media_type='text/plain')
        return {'response':f'<span style="font-weight:bold;">{clickedText}:</span><br><span style="font-weight:normal;">{reply}</span>'}
    except Exception as e:
        print(f'Query {query} and clickedText {clickedText} generated error {e} during processing')
        return {'response': 'Something went wrong generating the rationale. Please try again.'}

@app.post('/validate')
async def validate_query(query: str = Form(...)):
    if len(query) > 280:
        return False
    try:
        valid = gpt_funcs.query_validator(query)
        return {'valid':str(valid)}
    except Exception as e:
        print('the query {query} returned and error {e}')
        return {}

@app.post("/build-query")
async def process_query(healthform: models.HealthForm = Body(...)):
    try:
        new_query = gpt_funcs.query_str_maker(healthform.dict())
        return {'Query': new_query}
    except Exception as e:
        print(f'The healthform {healthform} generated error {e} during processing')
        return {}
