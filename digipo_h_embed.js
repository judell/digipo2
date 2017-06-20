function h_embed() {
  // http://digipo.pythonanywhere.com/static/articles/Sexism-and-Mental-Health.htm

  install_footnotes_container();

  var hyp_is_urls = find_and_decorate_hyp_is_urls();

  //console.log(hyp_is_urls);

  var hyp_is_results = get_hyp_is_results(hyp_is_urls);

  //console.log(hyp_is_results);

  settle(hyp_is_results.promises).then(function() {
    var footnote_objects = hyp_is_results.footnote_objects;
    for (var i = 0; i < hyp_is_urls.length; i++) {
      var hyp_is_url = hyp_is_urls[i];
      var footnote_object = footnote_objects[hyp_is_url];
      //  console.log ('footnote object', footnote_object);
      make_footnote_from_object(i, footnote_object);
    }
  });
}

/*
Scan for hyp.is urls
Decorate with superscripts pointing to (yet-to-be-generated) footnotes
Return array of hyp.is urls
*/
function find_and_decorate_hyp_is_urls() {
  var hyp_is_urls = [];
  var dls = document.querySelectorAll('a[href^="https://hyp.is"]');
  for (var i = 0; i < dls.length; i++) {
    var dl = dls[i];
    var url = "https://" + dl.href.match(/(hyp.is\/[^\/]+)/)[1];
    var id = dl.href.match(/hyp.is\/([^\/]+)/)[1];
    hyp_is_urls.push(url);
    var num = i + 1;
    dl.outerHTML +=
      '<a name="_fn_' +
      id +
      '"></a> <sup>(<a title="visit footnote" href="#fn_' +
      id +
      '">' +
      num +
      "</a>)</sup>";
  }
  return hyp_is_urls;
}

/*
Retrieve annotations from hyp_is urls
Construct objects from them
*/
function get_hyp_is_results(hyp_is_urls) {
  var promises = [];
  var footnote_objects = {};
  for (var i = 0; i < hyp_is_urls.length; i++) {
    var url = hyp_is_urls[i];
    var id = url.match(/hyp.is\/([^\/]+)/)[1];
    var options = {
      method: "GET",
      url: "https://hypothes.is/api/annotations/" + id
    };
    promises.push(
      makeRequest(options).then(function(data) {
        var row = parse_annotation(JSON.parse(data));
        url = row.url;
        var dl = "https://hyp.is/" + row.id;
        footnote_objects[dl] = {
          id: row.id,
          quote: row.quote,
          url: row.url,
          title: row.title,
          dl: dl
        };
      })
    );
  }
  return { promises: promises, footnote_objects: footnote_objects };
}

/*
Construct a footnote from a footnote object
Add it to the page
*/

function make_footnote_from_object(num, obj) {
  var url = obj.dl;

  var div = document.createElement("div");
  //  div.style['font-size'] = 'smaller';
  div.id = "fn_" + obj.id;
  div.innerHTML =
    '<a name="fn_' +
    obj.id +
    '">' +
    '<p class="footnote" style="font-size:smaller">' +
    num +
    ' <a target="_blank" href="' +
    url +
    '">' +
    obj.title +
    "</a>" +
    ' <a title="see in context" href="#_fn_' +
    obj.id +
    '">&#9166</a>' +
    "\n</p>" +
    '<blockquote style="font-family:italic">' +
    obj.quote +
    "</blockquote>";

  document.querySelector("#footnotes_container").appendChild(div);
}

function install_footnotes_container() {
  var footnotes_container = document.createElement("div");
  footnotes_container.setAttribute("id", "footnotes_container");

  var contents = document.querySelector("#contents");
  contents.appendChild(footnotes_container);

  var footnotes_header = document.createElement("h2");
  footnotes_header.innerHTML = "Footnotes";
  footnotes_container.appendChild(footnotes_header);

  var help_element = document.createElement("p");
  footnotes_container.appendChild(help_element);

  var help_doc = function() {/*
Footnotes appear here when you use Hypothesis <a href="https://hypothes.is/blog/direct-linking/">direct links</a> in the article. A direct link refers to a Hypothesis annotation which you can create by using the <a target="_blank" href="https://chrome.google.com/webstore/detail/digipo/dllkpndfjcodlhlfiiogdedeipjphkgk">Digipo Chrome Extension</a> or by using <a target="_blank" href="https://hypothes.is">Hypothesis</a> directly. 
Here's a <a target="_blank" href="http://jonudell.net/h/digipo_footnote_explainer_01.mp4">screencast</a> showing how.*/};

  help_element.innerHTML = heredoc(help_doc);
  help_element.style["font-size"] = "smaller";
}

function heredoc(fn) {
  var a = fn.toString();
  var b = a.slice(14, -3);
  return b;
}

function settle(promises) {
  var alwaysFulfilled = promises.map(function(p) {
    return p.then(
      function onFulfilled(value) {
        return { state: "fulfilled", value: value };
      },
      function onRejected(reason) {
        console.log("rejected promise");
        return { state: "rejected", reason: reason };
      }
    );
  });
  return Promise.all(alwaysFulfilled);
}

function makeRequest(opts) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(opts.method, opts.url);
    xhr.onload = function() {
      if (this.status >= 200 && this.status < 300) {
        //    console.log('makeRequest', opts.url, this.status);
        resolve(xhr.response);
      } else {
        console.log("makeRequest", opts.url, this.status);
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function() {
      console.log("makeRequest", opts.url, this.status);
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    if (opts.headers) {
      Object.keys(opts.headers).forEach(function(key) {
        xhr.setRequestHeader(key, opts.headers[key]);
      });
    }
    var params = opts.params;
    if (params && typeof params === "object") {
      params = Object.keys(params)
        .map(function(key) {
          return (
            encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
          );
        })
        .join("&");
    }
    xhr.send(params);
  });
}

function parse_annotation(row) {
  var id = row["id"];
  var url = row["uri"];
  var updated = row["updated"].slice(0, 19);
  var group = row["group"];
  var title = url;
  var refs = row.hasOwnProperty("references") ? row["references"] : [];
  var user = row["user"].replace("acct:", "").replace("@hypothes.is", "");
  var quote = "";
  if (
    // sigh...
    row.hasOwnProperty("target") && row["target"].length
  ) {
    var selectors = row["target"][0]["selector"];
    if (selectors) {
      for (var i = 0; i < selectors.length; i++) {
        var selector = selectors[i];
        if (selector["type"] == "TextQuoteSelector") quote = selector["exact"];
      }
    }
  }
  var text = row.hasOwnProperty("text") ? row.text : "";
  var tags = [];
  try {
    title = row.document.title;
    if (typeof title == "object") title = title[0];
    refs[id] = refs;
    tags = row.tags;
  } catch (e) {
    console.log(e);
  }
  return {
    id: id,
    url: url,
    updated: updated,
    title: title,
    refs: refs,
    user: user,
    text: text,
    quote: quote,
    tags: tags,
    group: group
  };
}

h_embed();
