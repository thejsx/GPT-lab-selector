from fastapi import Body, FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import openai
from dotenv import load_dotenv
import os
from fastapi.staticfiles import StaticFiles
import gpt_funcs
import labtests
from test_search import find_lab_test_matches_complete
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
    gpt_response = gpt_funcs.gpt_lab_recommender(query['query'])
    try:
        final_dict,panel_dict = find_lab_test_matches_complete(gpt_response)
    except:
        return {}
    return {'GPT tests':final_dict, 'Panels':panel_dict, 'Dicts':[labtests.test_dict['tests'],labtests.test_list]}

@app.post("/test-reasons")
async def test_query(query: str = Form(...), clickedText: str = Form(...)):
    reply = gpt_funcs.test_explanation(query,clickedText)
    # return Response(f'{clickedText}:<br/>{reply}', media_type='text/plain')
    return Response(f'<span style="font-weight:bold; font-size:16px;">{clickedText}:</span><br><span style="font-weight:normal; font-size:15px;">{reply}</span>',media_type='text/plain')

@app.post('/validate')
async def validate_query(query: str = Form(...)):
    valid = gpt_funcs.query_validator(query)
    return {'valid':str(valid)}

@app.post("/build-query")
async def process_query(healthform: models.HealthForm = Body(...)):
    new_query = gpt_funcs.query_str_maker(healthform.dict())
    return {'Query': new_query}
