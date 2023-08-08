import re
import regex
import copy
import openai
from labtests import test_dict_lower, test_list_lower, test_dict, test_list, reference_mask, test_list_str

def find_lab_test_matches_complete(gpt_response):
    labmatch = gpt_tests_regex(gpt_response)
    nomatch_dict,match_dict = initial_menu_match(labmatch)
    nomatch_dict, match_dict = reverse_menu_search(nomatch_dict,match_dict,labmatch)

    if len(match_dict)==0:
       return None
    if len(nomatch_dict) > 0:
        print('Some non-matches:')
        print(nomatch_dict)
        final_dict= match_dict
        # reply_dict = gpt_matcher(nomatch_dict)
        # final_dict = match_result_search(reply_dict,nomatch_dict,match_dict,labmatch)
    else:
        final_dict = match_dict
    final_dict = group_and_remove_tests(final_dict)
    panel_dict = build_panel_dict(final_dict)
    return final_dict, panel_dict

def gpt_tests_regex(messageReturned):
  regex1 = r"(?<=\d{1,2}\.\s+)(.+?)(?=\n|[:-]\s|$)"
  regex2= r"(?<=-\s+)(.+?)(?=\n|[-:]\s|$)"
  if '1. ' in messageReturned:
    labmatch = regex.findall(regex1,messageReturned)
  elif '\n- ' in messageReturned or ' - ' in messageReturned:
    labmatch = regex.findall(regex2,messageReturned)
  else:
    messageReturned_lower = messageReturned.lower()
    labmatch = []
    for index in range(len(test_list_lower)):
      if test_list[index] in messageReturned_lower or test_dict_lower[index] in messageReturned_lower:
        labmatch.append(test_dict_lower[index])
  print(labmatch)
  return labmatch

def initial_menu_match(labmatch):
  nomatch_dict, match_dict = {}, {}
  for x in range(len(labmatch)):
    match_dict[x] = []
  for index, value in enumerate(labmatch):
    match = value.lower()
    if match in test_dict_lower:
      match_dict[index].append(test_dict['tests'][test_dict_lower.index(match)])
    elif match in test_list_lower:
      match_dict[index].append(test_dict['tests'][test_list_lower.index(match)])
    else:
      nomatch_dict[value] = []
  return nomatch_dict, match_dict

def reverse_menu_search(nomatch_dict,match_dict,labmatch):
  for key in nomatch_dict.keys():
    value = key.lower()

    # search for test (from both abbrev and full lists) in string or search for string in test lists and append results
    for index in range(len(test_list_lower)):

      if bool(re.search(r"\b{}\b".format(re.escape(test_dict_lower[index])), value)) == True:
        nomatch_dict[key].append(test_dict['tests'][index])

      elif bool(re.search(r"\b{}\b".format(re.escape(test_list_lower[index])), value)) == True:
        nomatch_dict[key].append(test_dict['tests'][index])

      elif bool(re.search(r"\b{}\b".format(re.escape(value)), test_dict_lower[index])) == True  or bool(re.search(r"\b{}\b".format(value), test_list_lower[index])) == True:
        nomatch_dict[key].append(test_dict['tests'][index])

  copy_nomatch_dict = copy.deepcopy(nomatch_dict)
  for key, values in copy_nomatch_dict.items():
    if len(values) > 0:
      for value in values:
        match_dict[labmatch.index(key)].append(value)
      del nomatch_dict[key]
  return nomatch_dict, match_dict

def gpt_matcher(dict):
  reply_dict = {}
  for key in dict.keys():
    messages = [{"role": "system", "content": f'If test(s) similar to user input are in the following menu, return exact test name(s) in quotes otherwise return none: {test_list_str}'}]
    messages.append({"role": "user", "content":f'what tests from the menu are similar to: {key}'})
    response = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=messages, temperature = 1, max_tokens = 25)
    reply = response["choices"][0]["message"]["content"]
    reply_dict[key] = reply
  return reply_dict

def match_result_search(reply_dict,nomatch_dict,match_dict,labmatch):
  for key, reply in reply_dict.items():
    if "None" in reply:
      continue
    reg1 = r'(?:")([\w\s&]+?)(?:")'
    reg2 = r'(?<=\n-\s*)([\w\s&]+?)(?=\s?\n)'
    rlist = regex.findall(reg1,reply.lower())
    if len(rlist) == 0:
      rlist = regex.findall(reg2,reply.lower())
    for x in rlist:
      if x in test_dict_lower:
        priorval = False
        for values in match_dict.values():
          if test_dict['tests'][test_dict_lower.index(x)] in values:
            priorval = True
            break
        if priorval == True:
          continue
        match_dict[labmatch.index(key)].append(test_dict['tests'][test_dict_lower.index(x)])
      elif x in test_list_lower:
        if x in test_dict_lower:
          priorval = False
          for values in match_dict.values():
            if test_dict['tests'][test_list_lower.index(x)] in values:
              priorval = True
              break
          if priorval == True:
            continue
        match_dict[labmatch.index(key)].append(test_dict['tests'][test_list_lower.index(x)])
  return match_dict

def group_and_remove_tests(final_dict):
    new_dict = {}
    for key, tests in final_dict.items():
      for test in tests:
        ind = test_dict['tests'].index(test)
        if len(reference_mask['tests'][ind]) >0:
          reftest = test_dict['tests'][reference_mask['tests'][ind][0]]
          ref_bool = False 
          for testlist in final_dict.values():
            if reftest in testlist:
              ref_bool = True
              break
          if ref_bool == True:
            continue

        if test in new_dict.values():
          continue
        new_dict[f'Test {len(new_dict)+1}'] = test
    return new_dict

# Adds keys (test panels) and values (tests) to panel_dict if the supplied test is in a panel offered by PPL; will append that test to the correct panel if the panel is already in the dict

def build_panel_dict(final_dict):
    panel_dict = {}
    for val in final_dict.values():
        indexval = test_dict_lower.index(val.lower())
        for key, values in reference_mask['panels'].items():
            if indexval in values and key not in panel_dict.keys():
                panel_dict[key] = [test_list[indexval]]
            elif indexval in values and key in panel_dict:
                panel_dict[key].append(test_list[indexval])
    sort_vals, sort_keys = zip(*sorted(zip(list(panel_dict.values()),list(panel_dict.keys())), key = lambda x: len(x[0]), reverse = True))
    panel_dict = {}
    for x in range(len(sort_keys)):
        panel_dict[f'{sort_keys[x]} ({len(sort_vals[x])} {"test" if len(sort_vals[x])==1 else "tests"})'] = sort_vals[x] + [[test_list[y] for y in reference_mask['panels'][sort_keys[x]] if test_list[y] not in sort_vals[x] ]]
    return panel_dict

def remove_panels(query,panel_dict):
  keys = list(panel_dict.keys())
  for key in keys:
    if 'male' in query and "Women's" in key:
      del panel_dict[key]
    elif 'female' in query and "Men's" in key:
      del panel_dict[key]
  return panel_dict
