
let automaticLink = document.getElementsByClassName("spl-automatic-Link");

for (var i = 0 ; i < automaticLink.length; i++) {
    automaticLink[i].addEventListener("click", getDataLink);
}

function getDataLink(e) {
    e.preventDefault()
    const idAutomaticLink = this.getAttribute('data-spl')
    const href = this.getAttribute('href')
    const target = this.getAttribute('target')
    const keyword = this.innerHTML

    updateMetrics(idAutomaticLink,keyword).then(snap => {
        if(target) {
            window.open(href, target);
        }else{
            document.location = href
        }
    })
}

function updateMetrics(idAutomaticLink,keyword){

    return new Promise((resolve, reject) => {

        const http = new XMLHttpRequest()
        const url = document.getElementById("splUrlAutomaticLinks").value
        const idPost = document.getElementById("splPostIdAutomaticLinks").value

        let params = "type=ajax&id="+idAutomaticLink+"&idPost="+idPost+"&keyword="+keyword

        http.open('POST', url, true);

        http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

        http.onreadystatechange = function () {
            if (http.readyState == 4 && http.status == 200) {
                const response = JSON.parse(http.responseText)
                resolve(response)
            }
        }

        http.send(params);
    })
}

