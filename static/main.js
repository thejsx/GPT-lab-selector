var healthData = null;
var labTests = {};
let isFetching = false;

  
const fetchWithTimeout = (url, options, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    const optionsWithSignal = {...options, signal: controller.signal};
  
    return fetch(url, optionsWithSignal).finally(() => clearTimeout(id));
  };

function modalDialouge(text) {
    modal = document.getElementById('validModal')
    modal.textContent = text;
    modal.style.display = "block";
    window.onclick = function(event) {
        modal.style.display = "none";
}}

function compareDicts(dict1, dict2) {
    for (let key of Object.keys(dict1['Patient'])) {
        if (dict1['Patient'][key] !== dict2['Patient'][key]) {
            return false;
        }
    }
    // if  ((dict1['Conditions'].length !== 0 || dict2['Conditions'].length !== 0) &&(dict1['Conditions'].length !== dict2['Conditions'].length || dict1['Conditions'].every((val,index) => val !== dict2['Conditions'][index]) || dict2['Conditions'].every((val,index) => val !== dict1['Conditions'][index]))) {

    if (dict1['Conditions'].every(val => dict2['Conditions'].includes(val)) !== true || dict2['Conditions'].every(val => dict1['Conditions'].includes(val)) !== true) {
        return false;
    }
    if (dict1['Query'] !== dict2['Query']) {
        return false;
    }
    return true;
};

document.getElementById('nextButton1').addEventListener('click', function(event) {
    document.getElementById('disclaimer1').style.display = "none";
    document.getElementById('disclaimer2').style.display = "block";
});

document.getElementById('nextButton2').addEventListener('click', function(event) {
    document.getElementById('disclaimer2').style.display = "none";
    document.getElementById('disclaimer3').style.display = "block";
});

document.getElementById('nextButton3').addEventListener('click', function(event) {
    document.getElementById('disclaimer3').style.display = "none";
    document.getElementById('disclaimer4').style.display = "block";
});

document.getElementById('agreeButton').addEventListener('click', function(event) {
    document.getElementById('agreeModal').style.display = "none";
});

document.getElementById('cancelButton').addEventListener('click', function(event) {
    if(document.referrer === "" || document.referrer === "http://127.0.0.1:8000/") {
        window.location.href = "https://ppl-dev.luminatehealth.com/dat/browse";
    } else {
        window.history.back();
    }
});

document.getElementById('back1').addEventListener('click', function(event) {
    document.getElementById('disclaimer2').style.display = "none";
    document.getElementById('disclaimer1').style.display = "block";
});

document.getElementById('back2').addEventListener('click', function(event) {
    document.getElementById('disclaimer3').style.display = "none";
    document.getElementById('disclaimer2').style.display = "block";
});

document.getElementById('back3').addEventListener('click', function(event) {
    document.getElementById('disclaimer4').style.display = "none";
    document.getElementById('disclaimer3').style.display = "block";
});


document.addEventListener("keyup", function(event) {
    if (event.target.id === 'queryInput'){
        var txtInput = document.getElementById("queryInput").value;
        var validButton = document.getElementById('validateQuery')
        validButton.textContent = 'Validate'
        if (txtInput.length >0) {
            validButton.removeAttribute("disabled");
        }
        else {
            validButton.setAttribute('disabled',null);
            return
        }
        if (txtInput.length == 280) {
            modalDialouge('The query is at the maximum length (280 characters).')
        }
    }})

// code for clicking items that don't exist in initial page (verify, clear query, submit, clear form, close)
document.addEventListener('click', function(event) {
    if (event.target.id === 'validateQuery'){
    event.preventDefault();
    let validButton = document.getElementById('validateQuery');
    validButton.textContent = "Please wait..";
    document.body.style.cursor = 'wait'; 
    var query = document.getElementById('queryInput').value;
    fetch('/validate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'query=' + encodeURIComponent(query),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => console.error('Error:', error));
        }
        return response.json();})
    .catch(error => {
        console.error('Error converting response to JSON:', error);
        return {};
    })
    .then(data => {
        var valid = data['valid']
        if (valid==='True') {
            validButton.textContent = "VALID!"
            validButton.setAttribute('disabled',null)
        }
        else {
            validButton.textContent = "Invalid!"
            validButton.setAttribute('disabled',null)
            modalDialouge("That query is not valid! Please limit query to medical/health concerns or consider rephrasing.");
        }})
        .finally(() => {
            document.body.style.cursor = 'default';
        })
    }

    // code for clearing query box
    else if (event.target.id === "clearQuery") { 
        document.getElementById('queryInput').value = '';
        document.getElementById('validateQuery').textContent = 'Validate';
        document.getElementById('validateQuery').setAttribute('disabled',null);}

    //clear form
    else if (event.target.id === 'clearForm') {
        healthData = null;
        loadChecklist();        }

    // code (x2) for closing checklist    
    else if (event.target.id === 'modal-close') {
        document.getElementById('myModal').style.display = "none";      }

    else if (event.target.id === 'cancel') {
        document.getElementById('myModal').style.display = "none";    }
    
    // code for second refresh button
    else if (event.target.id === 'refresh2') {
            location.reload();}
    
    // code for second add health data button
    else if (event.target.id === 'addInfo2') {
        loadChecklist();    }
    } )

// Code for calling main GPT function after clicking Submit (now moved to submit checklist)
function submitQuery(query) {
    isFetching = true;
    document.getElementById('result1').innerHTML = '';
    document.getElementById('result2').innerHTML = '';
    labTests = {};
    document.body.style.cursor = 'wait';
    var loading = document.querySelector('.loading');
    loading.style.display = 'flex';

    // document.getElementById('notes-container').style.display = 'flex';
    // document.getElementById('notes').textContent = "Please note that the lab tests that are returned here may be inconsistent or inaccurate. Additionally, other laboratory or non-laboratory tests that are not offered here may be more appropriate. It is recommended that you consult with a qualified healthcare provider to determine what lab tests are most appropriate for your specific medical needs.";

    document.getElementById('Instructions').textContent = "Getting lab tests.. this could take a minute.";
    document.getElementById('rationaleCont').style.display = 'flex';

    let data = {query: query }
    fetch('/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            // if the status is 422, log the response body
            return response.json().then(error => console.error('Error:', error));
        }
        return response.json();})
    .catch(error => {
        console.error('Error converting response to JSON:', error);
        document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">Something went wrong with returning lab tests. Please try again.<br>Click on "Add health data" then fill out and submit the form to get assistance with lab test selection.</span><br>'+ 'If these issues are persistent, please click ' + '<a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer">here</a>' + ' to see if the OpenAI network is experiencing difficulties.';;
        modalDialouge('Something went wrong in returning lab tests. Please try again.')
        return {};
    })
    .then(data => {
        if (Object.keys(data).length === 0) {
            // If the data is empty, update the message
            document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">Something went wrong with returning lab tests.<br>Click on "Add health data" and consider changing your input or adding more health data then trying again.</span><br>'+ 'If these issues are persistent, please click ' + '<a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer">here</a>' + ' to see if the OpenAI network is experiencing difficulties.';
            modalDialouge('Something went wrong returning lab tests. Please try again.');
        } 
        else {
            if (Object.keys(data['GPT tests']).length <= 5) {
                document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">Only ' + Object.keys(data['GPT tests']).length + ' lab results were returned.<br>Consider adding more health data to get more lab results.</span><br>';
            }
            else {
                document.getElementById('Instructions').innerHTML = "Here are lab tests that may be helpful given your clinical history and concerns.<br>Please click on a lab test to see why.";}

        document.getElementById('messages').innerHTML = "Please click on a lab test above to get the rationale.";
        document.getElementById('results-container').style.display = 'grid';
        document.getElementById('q3').style.display = 'flex';

        window.scrollTo(0,0);

        var result1Div = document.getElementById('result1');
        var result2Div = document.getElementById('result2');
        var gptTestsDict = data["GPT tests"];
        var panelsDict = data["Panels"];

        for (var key in gptTestsDict) {

            // Create a new div for each row
            var rowDiv = document.createElement('div');
            rowDiv.style.display = 'contents';
        
            // Test link
            var aTest = document.createElement('a');
            aTest.innerHTML = gptTestsDict[key];
            aTest.style.cursor = 'pointer';
            aTest.addEventListener('click', createLinkClickHandler(query, data['Dicts']));
            rowDiv.appendChild(aTest);
        
            // Add to Cart link
            // var aCart = document.createElement('button');
            // aCart.innerHTML = 'Add to Cart';
            // aCart.className = 'cart-button';
            // aCart.href = '#'; // Placeholder URL
            // aCart.style.cursor = 'pointer';
            // rowDiv.appendChild(aCart);
        
            // More Info link
            var aInfoDiv = document.createElement('div');
            aInfoDiv.style.textAlign = 'center';
            var aInfo = document.createElement('a');
            aInfo.innerHTML = 'More Info';
            aInfo.className = 'info-button';
            aInfo.href = 'https://ppl-dev.luminatehealth.com/dat/test/details?testId=' + data['Link nums'][0][data['Dicts'][0].indexOf(gptTestsDict[key])]; // Placeholder URL
            aInfo.style.cursor = 'pointer';
            aInfoDiv.appendChild(aInfo);
            rowDiv.appendChild(aInfoDiv);
        
            // Append the row to the result div
            result1Div.appendChild(rowDiv);
        }     
       
        for (var key in panelsDict) {
            var rowDiv = document.createElement('div');
            rowDiv.style.display = 'contents';

            var aPanel = document.createElement('a');
            aPanel.innerHTML = key;
            aPanel.style.cursor = 'pointer';
            aPanel.addEventListener('click', panelClick);
            rowDiv.appendChild(aPanel);

            // var aCart = document.createElement('button');
            // aCart.innerHTML = 'Add to Cart';
            // aCart.className = 'cart-button'
            // aCart.href = '#'; // Placeholder URL
            // aCart.style.cursor = 'pointer';
            // rowDiv.appendChild(aCart);
        
            var aInfoDiv = document.createElement('div');
            aInfoDiv.style.textAlign = 'center';
            var aInfo = document.createElement('a');
            aInfo.innerHTML = 'More Info';
            aInfo.className = 'info-button';
            aInfo.href = 'https://ppl-dev.luminatehealth.com/dat/test/details?testId=' + data['Link nums'][1][key.slice(0,key.indexOf(' ('))];; //  URL
            aInfo.style.cursor = 'pointer';
            aInfoDiv.appendChild(aInfo);
            rowDiv.appendChild(aInfoDiv);

            result2Div.appendChild(rowDiv);

            // create a seperate html element for the panel tests
            var panelBox = document.getElementById('panel-box');
            var panelTests = document.createElement('div');
            panelTests.className = 'panel';
            panelTests.id = key;
            var boldkey = document.createElement('div');
            boldkey.className = 'bold-key';
            boldkey.innerHTML = 'The following tests are included in the ' + key.slice(0,key.indexOf('(')-1) + ':' + '<br><br>';
            panelTests.appendChild(boldkey);
            var testGrid = document.createElement('div');
            testGrid.className = 'test-grid';
            panelsDict[key].forEach((item) => {
                if (typeof item === 'string') {
                    var test = document.createElement('a');
                    test.style.cursor = 'pointer;'
                    test.addEventListener('click',createLinkClickHandler(query, data['Dicts']));
                    test.innerHTML = item;
                    testGrid.appendChild(test);
                }
                else {
                    for (let i=0; i<item.length; i++) {
                        var div = document.createElement('div');
                        var textNode = document.createTextNode(item[i]);
                        div.appendChild(textNode);
                        testGrid.appendChild(div);
                    }
                }
            })
            panelTests.appendChild(testGrid);
            panelBox.appendChild(panelTests);

        }
}})
    .catch((error) => {
      console.error('Error:', error);
    })
    .finally(() => {
        isFetching=false;
        document.getElementById('second-button-container').style.display = 'flex';
        loading.style.display = 'none';
        document.body.style.cursor = 'default';
    });
};

// Code for clicking Start Over (1 or 2)
document.getElementById('refresh').addEventListener('click', function() {
    location.reload();});

// code for clicking on test links
function createLinkClickHandler(query, data) {
    return function handleLinkClick(event) {
        if (isFetching) return;
        isFetching = true;
        var clickedText = event.target.textContent;
        equivalentNames = colorLinkHandler(clickedText, data);
        if (clickedText in labTests && labTests[clickedText] !== 'Something went wrong generating the rationale. Please try again.') {
            document.getElementById('messages').innerHTML = labTests[clickedText];
            document.getElementById('Instructions').innerHTML = 'See lab test rationale below.<br> Click on another test to get reasons for test.'
            document.getElementById('messages').scrollIntoView({behavior: 'smooth' });
            isFetching=false;
            return 
        }
        event.preventDefault();
        document.body.style.cursor = 'wait';
        var loading = document.querySelector('.loading');
        loading.style.display = 'flex';

        document.getElementById('Instructions').textContent = "Getting lab test rationale.. please wait";
        fetchWithTimeout('/test-reasons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'query=' + encodeURIComponent(query) + '&clickedText=' + encodeURIComponent(clickedText),
        })
        .then(response => {
            if (!response.ok) {
                document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">There was a problem with the network.<br> Please try again.</span>';
                modalDialouge('Something went wrong getting the test rationale. Please wait a few seconds then try again.');
                throw new Error('There was a problem with the network. Please try again.');
            }
            return response.json()})
        
        .then(data => {
            // Handle the response data here
            document.getElementById('messages').innerHTML = data['response'];
            equivalentNames.forEach(test => {
                labTests[test] = data['response']
            });
            document.getElementById('Instructions').innerHTML = 'See lab test rationale below.<br> Click on another test to get the rationale for that test.'
            document.getElementById('messages').scrollIntoView({behavior: 'smooth' });
            
        })
        .catch((error) => {
            console.error('Error:', error);
            document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">The server had difficulty retrieving the test rationale. Please try again.<br></span>' + 'If these issues are persistent, please click ' + '<a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer">here</a>' + ' to see if the OpenAI network is experiencing difficulties.';
            modalDialouge('Something went wrong retrieving the test rationale. Please wait a few seconds then try again.');
        })
        .finally(() => {
            isFetching=false;
            document.body.style.cursor = 'default';
            loading.style.display = 'none';
        });
    }};

function panelClick(event) {
        var clickedText = event.target.textContent;
        event.stopPropagation();
        var panel = document.getElementById(clickedText);
        panel.style.display = 'flex';
        var modal = document.getElementById('panelModal');
        modal.style.display = 'flex';
        window.onclick = function(event) {
            modal.style.display = "none";
            panel.style.display = "none";
        }
    }

// code to color all equivalent links green after clicking (no longer needed) now just returns equivalent names
function colorLinkHandler(clickedText,data) {
    equivalentNames = [clickedText];
    if (data[0].indexOf(clickedText) != -1 && data[1].indexOf(clickedText) !== -1) {}
    else if (data[0].indexOf(clickedText) != -1) {
            equivalentNames.push(data[1][data[0].indexOf(clickedText)])     }
    else {
        equivalentNames.push(data[0][data[1].indexOf(clickedText)])    }

                // Select all links with the equivalent name (not used anymore)
    let links = document.getElementsByTagName("a");
    for (let i = 0; i < links.length; i++) {
        links[i].style.color = '';
        let linkText = links[i].textContent;
        for (let j = 0; j < equivalentNames.length; j++) {
            if (linkText.indexOf(equivalentNames[j]) !== -1) {
                links[i].style.color = "green";
                break;}

        }}
    return equivalentNames}

// code for loading the checklist on click of Add health data (1 or 2) or clearing checklist (both use fuction loadChecklist)

document.getElementById("addInfo").addEventListener("click", loadChecklist);

function loadChecklist() {
    if (isFetching) return;
    fetch('static/checklist.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('modal-content-id').innerHTML = data;

            // setting checklist values to those in the global healthData variable
            if (healthData != null) {
                Object.keys(healthData['Patient']).forEach(key => {
                    if (healthData['Patient'][key] !== '') {
                        document.getElementById(key).value = healthData['Patient'][key];
                    }
                })
                if (healthData['Conditions'].length >0) {
                    healthData['Conditions'].forEach(cond =>{
                        document.getElementById(cond).checked = true;
                    })    
                }
                if (healthData['Query'].length >0) {
                    document.getElementById('queryInput').textContent = healthData['Query'];
                    document.getElementById('validateQuery').textContent = 'VALID!';
                    document.getElementById('validateQuery').setAttribute('disabled',null);
                }
            }

            document.getElementById('myModal').style.display = "flex";
            const boxContents = document.querySelectorAll('.box-content');

            boxContents.forEach((boxContent) => {
                Array.from(boxContent.children)
                    .sort((a, b) => a.textContent.localeCompare(b.textContent))
                    .forEach(node => boxContent.appendChild(node));
                });
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

  // code for submitting checklist
document.addEventListener('click', function(event) {
    if (event.target.id === 'submitChecklist'){
        event.stopPropagation();
        var healthDict = {};
        healthDict['Patient'] = {}
        var checkboxes = document.querySelectorAll('#modal-content-id input[type="checkbox"]');
        var checkedValues = Array.from(checkboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.id);
        healthDict['Conditions'] = checkedValues
        var dropDowns = Array.from(document.querySelectorAll('#modal-content-id select.drop-down'));
        dropDowns.forEach(function(dropdown) {
            healthDict['Patient'][dropdown.id] = dropdown.value;
        });
        healthDict['Query'] = document.getElementById('queryInput').value;

        if (Object.values(healthDict['Patient']).every(value => value == '') && healthDict['Conditions'].length == 0 && healthDict['Query'].length == 0){

            modalDialouge('Cannot submit an empty questionnaire! Please add information then click "Submit"');
        }
        else if (healthDict['Query'].length >0 && document.getElementById('validateQuery').textContent !== 'VALID!') {
            modalDialouge('Please validate or remove query before clicking Submit');
            }

        else if (healthData != null && compareDicts(healthDict,healthData) == true && document.getElementById('result1').textContent.length > 0) {
            modalDialouge('No changes have been made to the form. Please make changes before submitting or press the "X" or "Cancel" to exit.');
        }

        else {
            healthData = healthDict;
            document.getElementById('myModal').style.display = "none";
            fetch('/build-query', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(healthDict),
                })
                .then(response => {
                    if (!response.ok) {
                        // if the status is 422, log the response body
                        return response.json().then(error => console.error('Error:', error));
                    }
                    return response.json();})
                .catch(error => {
                    console.error('Error converting response to JSON:', error);
                    return {};
                })
                .then(data => {
                    document.getElementById('input-container').style.display = 'flex';
                    document.getElementById('query').textContent = data['Query'];

                    // pass data to the main GPT function
                    submitQuery(data['Query']);
                })
        }
    }})


// code to click and drag modal-window
document.addEventListener('mousedown', function(event){
    if (event.target.id == 'modal-draggable') {

        var box = document.getElementById('modal-content-id');
        var modal = document.getElementById('myModal');
        var header = box.getElementsByClassName('modal-draggable')[0];
        var shiftX = event.clientX - box.getBoundingClientRect().left;
        var shiftY = event.clientY - box.getBoundingClientRect().top;

        box.style.position = 'absolute';
        box.style.zIndex = 1000;

        function moveAt(pageX, pageY) {
            // Ensure modal doesn't move beyond the bounds of its parent
            var parentRect = modal.getBoundingClientRect();
            var boxRect = box.getBoundingClientRect();
            var newLeft = pageX - shiftX;
            var newTop = pageY - shiftY;

            if (newLeft < parentRect.left) {
                newLeft = parentRect.left;
            } else if (newLeft + boxRect.width > parentRect.right) {
                newLeft = parentRect.right - boxRect.width;
            }
            
            if (newTop < parentRect.top) {
                newTop = parentRect.top;
            } else if (newTop + boxRect.height > parentRect.bottom) {
                newTop = parentRect.bottom - boxRect.height;
            }

            box.style.left = newLeft + 'px';
            box.style.top = newTop + 'px';
        }

        moveAt(event.pageX, event.pageY);

        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
        }

        document.addEventListener('mousemove', onMouseMove);

        document.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.onmouseup = null;
        };
        header.ondragstart = function() {
        return false;
        };
    }
})
