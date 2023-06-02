import openai
from labtests import test_list_str
    
def test_explanation(query, clickedText):
    messages = [{"role": "system", "content": f'In 75 tokens or less explain why this lab test might be helpful in the below history/complaint. Do not include test name in response: {clickedText}'}]
    messages.append({"role": "user", "content":f'History/complain: {query}'})
    response = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=messages, temperature = 1, max_tokens = 75)
    return response["choices"][0]["message"]["content"]

def query_validator(query):
    messagesInput = [{"role": "system", "content": f'Return "yes" as first word if input is related to health or wellness. Otherwise return "no" as first word'}]
    messagesInput.append({'role':'user','content':query})
    response = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=messagesInput, temperature = 0.5, max_tokens=5)
    resp = response["choices"][0]["message"]["content"].lower()
    if 'yes' in response["choices"][0]["message"]["content"].lower()[:4]:
        responseValid = True
    else:
        responseValid = False
    return responseValid

def query_str_maker(patient_dict):
    new_query = 'Patient is' + (f' {patient_dict["Patient"]["age"]} yr old' if len(patient_dict["Patient"]["age"]) > 0 else '') + (f' {patient_dict["Patient"]["gender"]}' if len(patient_dict["Patient"]["gender"]) > 0 else '') + (f' {patient_dict["Patient"]["weight"]} lbs' if len(patient_dict["Patient"]["weight"]) > 0 else '')
    new_query = (f"Patient with the following condition(s): {', '.join(patient_dict['Conditions'])}. " if len(patient_dict['Conditions'])>0 else '') if new_query == 'Patient is' else (f"{new_query} with the following condition(s): {', '.join(patient_dict['Conditions'])}. " if len(patient_dict['Conditions'])>0 else f'{new_query}. ')
    if patient_dict['Query'] != '':
      new_query = new_query + 'Concern: ' + patient_dict['Query']
    return new_query

def gpt_lab_recommender(prompt):
    messages = [{"role": "system", "content": f'A lab is curious what tests from the following menu would be helpful for a patient history/concern described below. Please provide names of up to 10 helpful tests (no description, return numbered list): {test_list_str}'}]
    messages.append({"role": "user", "content":prompt})
    response = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=messages, temperature = 1, max_tokens=125)
    reply = response["choices"][0]["message"]["content"]
    messages.append({"role": "assistant", "content":reply})
    return(messages[-1]['content'])