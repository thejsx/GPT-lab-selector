var healthData = null;
var labTests = {};

let isFetching = false;

const fetchWithTimeout = (url, options, timeout = 6000) => {
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
    if  (dict1['Conditions'].length !== dict2['Conditions'].length || dict1['Conditions'].every((val,index) => val !== dict2['Conditions'][index]) || dict2['Conditions'].every((val,index) => val !== dict1['Conditions'][index])) {
        return false;
    }
    if (dict1['Query'] !== dict2['Query']) {
        return false;
    }
    return true;
};


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

// code for clicking items that don't exist in initial page (verify clear query, submit, clear form, close)
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
    document.getElementById('notes-container').style.display = 'flex';
    document.getElementById('Instructions').textContent = "Getting lab tests.. this could take a minute.";
    document.getElementById('notes').textContent = "Please note that the lab tests that are returned here may be inconsistent or inaccurate. Additionally, other laboratory or non-laboratory tests that are not offered here may be more appropriate. It is recommended that you consult with a qualified healthcare provider to determine what lab tests are most appropriate for your specific medical needs.";

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
        document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">Something went wrong with returning lab tests. Please try again.<br>Click on "Add health data" then fill out and submit the form to get assistance with lab test selection.</span>';
        modalDialouge('Something went wrong in returning lab tests. Please try again.')
        return {};
    })
    .then(data => {
        if (Object.keys(data).length === 0) {
            // If the data is empty, update the message
            document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">Something went wrong with returning lab tests. Please try again.<br>Click on "Add health data" then fill out and submit the form to get assistance with lab test selection.</span>';
            modalDialouge('Something went wrong in returning lab tests. Please try again.');
        } 
        else {
        document.getElementById('Instructions').innerHTML = "Here are lab tests that may be helpful given your clinical history and concerns.<br>Please click on a lab test to see why.";

        document.getElementById('messages').innerHTML = "Please click on a lab test above to get the rationale.";

        var result1Div = document.getElementById('result1');
        var result2Div = document.getElementById('result2');
        var gptTestsDict = data["GPT tests"];
        var panelsDict = data["Panels"];

        for (var key in gptTestsDict) {
            var a = document.createElement('a');
            a.innerHTML = gptTestsDict[key]
            a.style.cursor = 'pointer;'
            a.addEventListener('click',createLinkClickHandler(query, data['Dicts']));
            result1Div.appendChild(a);
        }
       
        for (var key in panelsDict) {
            var panel = document.createElement('div');
            panel.className = 'panel';
            var panelTitle = document.createElement('div');
            panelTitle.innerHTML = '<span class="bold-key">' + key + ':' + '</span>';
            panel.appendChild(panelTitle);
            var tests = document.createElement('div');
            tests.className = 'indented-item';
            panelsDict[key].forEach((item) => {
                var test = document.createElement('a');
                test.style.cursor = 'pointer;'
                test.addEventListener('click',createLinkClickHandler(query, data['Dicts']));
                test.innerHTML = item;
                tests.appendChild(test);
            })
            panel.appendChild(tests);
            result2Div.appendChild(panel);
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
                modalDialouge('Something went wrong getting the test rationale. Please wait about 10 seconds then try again.');
                throw new Error('There was a problem with the network. Please try again.');
            }
            return response.json()})
        
        .then(data => {
            // Handle the response data here
            document.getElementById('messages').innerHTML = data['response'];
            equivalentNames.forEach(test => {
                labTests[test] = data['response']
            });
            document.getElementById('Instructions').innerHTML = 'See lab test rationale below.<br> Click on another test to get reasons for test.'
            document.getElementById('messages').scrollIntoView({behavior: 'smooth' });
            
        })
        .catch((error) => {
            console.error('Error:', error);
            document.getElementById('Instructions').innerHTML = '<span style="font-weight:bold; color:red;">There was a problem with the network.<br> Please try again.</span>';
            modalDialouge('Something went wrong getting the test rationale. Please wait about 10 seconds and try again.');
        })
        .finally(() => {
            isFetching=false;
            document.body.style.cursor = 'default';
            loading.style.display = 'none';
        });
    }};

// code to color all equivalent links green after clicking
function colorLinkHandler(clickedText,data) {
    equivalentNames = [clickedText];
    if (data[0].indexOf(clickedText) != -1 && data[1].indexOf(clickedText) !== -1) {}
    else if (data[0].indexOf(clickedText) != -1) {
            equivalentNames.push(data[1][data[0].indexOf(clickedText)])     }
    else {
        equivalentNames.push(data[0][data[1].indexOf(clickedText)])    }

    let links = document.getElementsByTagName("a");
            // Select all links with the equivalent name
    for (let i = 0; i < links.length; i++) {
        links[i].style.color = 'black';
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

            console.log('no data');
            modalDialouge('Cannot submit an empty questionnaire! Please add information then click "Submit"');
        }
        else if (healthDict['Query'].length >0 && document.getElementById('validateQuery').textContent !== 'VALID!') {
            modalDialouge('Please validate or remove query before clicking Submit');
            }

        else if (healthData != null && compareDicts(healthDict,healthData) == true && document.getElementById('result1').textContent.length > 0) {
            console.log('healtDict and healthData are equal');
            modalDialouge('No changes have been made to the form. Please make changes before submitting or press the "X" at the top right to exit.');
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
