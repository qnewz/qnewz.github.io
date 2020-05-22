function api_get(url, ok_callback){
    //TODO: error_callback
    var r = new XMLHttpRequest()
    r.open("GET", 'https://195-133-144-177.sslip.io/mn-api/v1/' + url, true)
    r.onreadystatechange = function(){
        if(r.readyState != 4 || r.status != 200) return        
        var result = JSON.parse(r.responseText)
        ok_callback(result)
    }
    r.send()
}

function getWidth(){
    return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth
    )
}

function out(msg){
    document.title = msg
    //console.log('out:', msg)
}

function onkey(e){
    if(document.getElementById('news-panel').classList.contains("hidden")){
        return
    }
    if(e.key == 'ArrowLeft'){
        swipeCard(undefined, -1)
        return
    }
    if(e.key == 'ArrowRight'){
        swipeCard(undefined, 1)
        return
    }
    //console.log('on key', e)
}

function ontap(){
    var a = document.createElement('a')
    a.href = queue[0].url
    a.target = "_blank"
    a.rel = "noreferrer"
    a.click()
    //window.open(queue[0].url, '_blank', 'noreferrer=yes,noopener=yes,toolbar=yes,location=yes')
}

function onpan(e) {
    moveTo(e.deltaX, 0)
    if(e.deltaX > 0){
        document.getElementById('v-mark').style.display = 'block'
        document.getElementById('x-mark').style.display = 'none'
    }
    else if(e.deltaX < 0){
        document.getElementById('x-mark').style.display = 'block'
        document.getElementById('v-mark').style.display = 'none'
    }
    var threshold = 100
    if(e.isFinal === true){
        if(e.deltaX > threshold){
            swipeCard(e.deltaX, 1)
        }
        else if(e.deltaX < -threshold){
            swipeCard(e.deltaX, -1)
        }
        else{
            turnCardBack(e.deltaX)
        }
    }
}

function moveTo(x, y){
    document.getElementById('top-card').style.left = x + 'px'
}

function process_result(result){
    var news = queue.shift()
    if(news.result !== result){
        news.result = result
        send_result(news)
    }
    var history = JSON.parse(localStorage.getItem('history') || '[]')
    for(var i = 0; i < history.length; i++){
        if(history[i].id == news.id){
            //эта новость уже есть в истории
            history.splice(i, 1)
            break
        }
    }
    history.unshift(news)
    var history_max_lenght = 50
    if(history.length > history_max_lenght){
        history.splice(history_max_lenght,
                       history.length - history_max_lenght)
    }
    localStorage.setItem('history', JSON.stringify(history))
}

function show_cards(){
    on_news_tab()
    if(queue.length > 0){
        setData(1, queue[0])
        if(queue.length > 1){
            setData(2, queue[1])
        }
        else{
            // TODO: show loading...
        }
    }
    else{
        // TODO: show loading...
    }
    document.getElementById('x-mark').style.display = 'none'
    document.getElementById('v-mark').style.display = 'none'
    moveTo(0, 0)
    if(queue.length < 5){
        append_queue()
    }
}

function swipeCard(dx, sign){
    if(dx == undefined){
        var el = document.getElementById('top-card')
        dx = parseInt(/\d+/.exec(el.style.left))
        if(dx != 0){
            // если тут не выйти, то пролистывает следующую карточку
            return
        }
    }
    var pos = dx
    var dw =  getWidth()
    var inc = sign*10
    function frame() {
        if(pos < -dw || pos > dw){
            clearInterval(id)
            process_result(sign > 0)
            show_cards()
        } else {						
            pos += inc;
            moveTo(pos, 0)
        }
    }
    var id = setInterval(frame, 1)
}

function turnCardBack(dx){
    var pos = dx;  		
    var inc = 2						
    var id = setInterval(frame, 1)
    function frame() {
        if(pos == 0){
            clearInterval(id);
            document.getElementById('x-mark').style.display = 'none'
            document.getElementById('v-mark').style.display = 'none'
        } else {
            if(pos > -inc || pos < inc){
                pos = 0
            }
            else if(pos < 0){
                pos += inc
            }
            else{
                pos -= inc
            }
            moveTo(pos, 0)
        }
    }
}

function ellipsizeTextBox(el) {
    var wordArray = el.innerText.split(' ');
    var i = 0
    while(el.scrollHeight > el.offsetHeight){
        wordArray.pop();
        el.innerText = wordArray.join(' ') + ' ...';
        if(wordArray.length == 0){
            break
        }
        i += 1
    }
}

function setData(id, item){
    var bg = document.getElementById('bg' + id)
    bg.style.backgroundImage = 'url(' + item['img'] + ')'
    var title = document.getElementById('title' + id)
    title.innerText = item['title']
    var ref = document.getElementById('reference' + id)
    ref.innerText = item['ref']
    var description = document.getElementById('description' + id)
    description.innerText = item['description'] 
                            //+ ' | ' + item['description'] // для тестов
    ellipsizeTextBox(description)
}

function get_token(){
    return localStorage.getItem('token')
}

function init_token(callback_func){
    if(localStorage.getItem('token')){
        callback_func()
        return
    }
    api_get("new_token", function(result){
        localStorage.setItem('token', result['token'])
        callback_func()
    })
}

function send_result(news){
    var news_id = news.id
    var view_result = news.result
    var news_title = news.title
    api_get("save_result/" +
            get_token() + "/" +
            news_id + "/" +
            (view_result ? 2 : 1),
            function(result){
                console.log('on result',news_id,
                            view_result, result, news_title)
            })
}

function preload_images(){
    var dw =  getWidth()
    for(var i = 0; i < queue.length; i++){
        var img_url = 'https://195-133-144-177.sslip.io/mn-img/' + dw + '/' + i
        if(queue[i].img == undefined){
            queue[i].img = img_url
        }
        var p = document.getElementById('preload_img_' + i)
        if(p){
            p.href = queue[i].img
            continue
        }
        p = document.createElement("link")
        p.rel = "preload"
        p.as = "image"
        p.href = queue[i].img
        p.id = "preload_img_" + i
        document.head.appendChild(p)
    }
}

function load_queue(callback_func){
    var token = get_token()
    api_get("get_news/" + token, function(result){
        queue = result["news_list"]
        callback_func()
    })
}

append_queue_entry_time = 0

function append_queue(){    
    var token = get_token()
    var now = +(new Date())
    if(now - append_queue_entry_time < 10000){
        return
    }
    append_queue_entry_time = now
    api_get("get_news/" + token, function(result){
        var new_queue = result["news_list"]
        for(var i = 0; i < new_queue.length; i++){
            var item = new_queue[i]
            var fresh = true
            for(var j = 0; j < queue.length; j++){
                var queue_item = queue[j]
                if(item.id == queue_item.id){
                    fresh = false
                    break
                }
            }
            if(fresh){
                queue.push(item)
            }
        }
        preload_images()
    })
}

function on_news_tab(){
    document.getElementById('news-panel').classList.remove("hidden")
    document.getElementById('history-panel').classList.add("hidden")
    document.getElementById('search-panel').classList.add("hidden")
    document.getElementById('more-panel').classList.add("hidden")

    document.getElementById('news-tab').classList.add("selected")
    document.getElementById('history-tab').classList.remove("selected")
    document.getElementById('search-tab').classList.remove("selected")
    document.getElementById('more-tab').classList.remove("selected")
}

function on_history_item(div){
    var history = JSON.parse(localStorage.getItem('history') || '[]')
    var index = div.dataset.index
    if(index >= history.length){
        console.log('invalid index:', index)
        return
    }
    var news = history[index]
    if(queue.length == 0){
        queue[0] = news
        show_cards()
        return
    }
    if(queue[0].result !== undefined){
        queue[0] = news
        show_cards()
        return
    }
    queue.unshift(news)
    show_cards()
}

function on_history_tab(){
    document.getElementById('news-panel').classList.add("hidden")
    document.getElementById('history-panel').classList.remove("hidden")
    document.getElementById('search-panel').classList.add("hidden")
    document.getElementById('more-panel').classList.add("hidden")

    document.getElementById('news-tab').classList.remove("selected")
    document.getElementById('history-tab').classList.add("selected")
    document.getElementById('search-tab').classList.remove("selected")
    document.getElementById('more-tab').classList.remove("selected")

    var history_list = document.getElementById("history-list")
    var history = JSON.parse(localStorage.getItem('history') || '[]')
    if(history.length == 0){
        history_list.innerHTML =
        '<div class="list-header">Здесь будет отображаться список ' +
        'последних просмотренных новостей.</div>'
        return
    }
    history_list.innerHTML = ''
    //'<div class="list-header">Последние просмотренные новости:</div>'
    for(var i = 0; i < history.length; i++){
        var news = history[i]
        var div = document.createElement("div")
        div.className = "list-item result-" + (news.result ? 'v' : 'x') 
        div.dataset.index = i
        div.onclick = function(){on_history_item(this)}
        var img = document.createElement("img")
        img.src = "result-" + (news.result ? 'v' : 'x') + '.svg'       
        div.appendChild(img)
        var span = document.createElement("span")
        span.innerText = news.title
        div.appendChild(span)
        history_list.appendChild(div)
        if(history_list.scrollHeight > history_list.offsetHeight){
            history_list.removeChild(div)
            break
        }
    }
}

function on_search_tab(){
    document.getElementById('news-panel').classList.add("hidden")
    document.getElementById('history-panel').classList.add("hidden")
    document.getElementById('search-panel').classList.remove("hidden")
    document.getElementById('more-panel').classList.add("hidden")

    document.getElementById('news-tab').classList.remove("selected")
    document.getElementById('history-tab').classList.remove("selected")
    document.getElementById('search-tab').classList.add("selected")
    document.getElementById('more-tab').classList.remove("selected")
}

function on_more_tab(){
    document.getElementById('news-panel').classList.add("hidden")
    document.getElementById('history-panel').classList.add("hidden")
    document.getElementById('search-panel').classList.add("hidden")
    document.getElementById('more-panel').classList.remove("hidden")

    document.getElementById('news-tab').classList.remove("selected")
    document.getElementById('history-tab').classList.remove("selected")
    document.getElementById('search-tab').classList.remove("selected")
    document.getElementById('more-tab').classList.add("selected")

    document.getElementById('menu-version').innerText = "Версия: 0.12"
}

function on_search_query(e){
    if(e.keyCode == 13 || e.keyCode == 10){
        on_search_button()
        return
    }
    //console.log(e)
}

function on_search_item(div){
    var search_result = JSON.parse(localStorage.getItem('search-result') || '[]')
    var index = div.dataset.index
    if(index >= search_result.length){
        console.log('invalid index:', index)
        return
    }
    var news = search_result[index]
    if(queue.length == 0){
        queue[0] = news
        show_cards()
        return
    }
    if(queue[0].result !== undefined){
        queue[0] = news
        show_cards()
        return
    }
    queue.unshift(news)
    preload_images()
    show_cards()
}

function on_search_button(){
    var query = document.getElementById("search-query").value
    query = encodeURIComponent(encodeURIComponent(query))
    var token = get_token()
    api_get("search/" + token + "/" + query, function(result){
        var search_list = document.getElementById("search-list")
        if(result.result.length == 0){            
            search_list.innerHTML = '<div class="list-header">' +
             'По запросу <span id="query-not-found"></span>' + 
             ' ничего не найдено.</div>' +
             '<div class="list-header">Рекомендации:<ul>' + 
             '<li>Проверьте, нет ли ошибок в словах.</li>' +
             '<li>Попробуйте поменять запрос.</li>' +
             '<li>Посмотрите <a href="javascript:help_search()">' +
             'раздел помощи по поиску</a>.</li></ul></div>'
            var query = result.query
            if(query.length > 100){
                query = query.substring(0, 100) + '...'
            }
            document.getElementById('query-not-found').innerText = query
            return
        }
        search_list.innerHTML = ''
        /*search_list.innerHTML =
            '<div class="result-header">Результаты поиска:</div>'*/
        console.log('search results for ' + result.query)
        var search_result = []
        for(var i = 0; i < result.result.length; i++){            
            var info = result.result[i]
            var res = info.result === 2 ? 'v' :
                      (info.result === 1 ? 'x' : 'n')
            var div = document.createElement("div")
            div.className = "list-item result-" + res
            div.dataset.index = i
            div.onclick = function(){on_search_item(this)}
            var img = document.createElement("img")
            
            img.src = "result-" + res + '.svg'       
            div.appendChild(img)
            var span = document.createElement("span")
            span.innerText = info.title
            div.appendChild(span)
            search_list.appendChild(div)            
            if(search_list.scrollHeight > search_list.offsetHeight){
                search_list.removeChild(div)
                break
            }
            search_result.push(info)
        }
        localStorage.setItem("search-result", JSON.stringify(search_result))
    })
}

function help_search(){
    alert('ok!')
    return false
}

function is_apple_device(){
    return (
      (navigator.userAgent.toLowerCase().indexOf("ipad") > -1) ||
      (navigator.userAgent.toLowerCase().indexOf("iphone") > -1) ||
      (navigator.userAgent.toLowerCase().indexOf("ipod") > -1)
     )
}

function init(){
    queue = []

    init_token(function(){
        load_queue(function(){
            preload_images()
            show_cards()
            //document.getElementById('splash').style.display="none"
        })
    })
    
    var card1 = document.getElementById('top-card')
    var hammer = new Hammer(card1)
    hammer.add(new Hammer.Pan({ threshold: 0, pointers: 0 }))
    hammer.on('pan', onpan)
    hammer.on('tap', ontap)

    window.onkeydown = onkey

    if(!is_apple_device()){
        document.body.classList.add('can-hover');
    }
    
    /*
    setTimeout(function(){
        document.getElementById('splash').style.display="none"
    }, 1000)
    */
    //document.onkeydown = onkey
    //card1.focus()
}