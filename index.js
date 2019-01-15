require('colors');
const rp = require('request-promise');
const $ = require('cheerio');
const jsdiff = require('diff');
const Sequelize = require('sequelize');

/**
 * npm rebuild si avisa de que necesita sqlite3 manual
 * @type {Sequelize}
 */
const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',

    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },

    // SQLite only
    storage: './database.sqlite',

    // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
    operatorsAliases: false
});
/**
 *
 * @type {Model}
 */
const Findings = sequelize.define('findings', {
    url: Sequelize.STRING,
    parent: Sequelize.SMALLINT,
    selector: Sequelize.STRING,
    content: Sequelize.TEXT
});

function process(url, selector, options) {

    options = Object.assign({
        childSelector: '',
        childLimit: null,
        childOffset: null
    }, options || {});

    sequelize.sync()
        .then(() => {
            findingStart(url, selector)
                .then((finding) => {
                    let findingParentId = finding.id;

                    getAnchors(url, {
                        'selector': selector,
                        offset: options.childOffset, // number, not index
                        limit: options.childLimit // number, not index
                    }, function (result){

                        finding.content = result.links;

                        finding.save().then(() => {
                            
                        });

                        return;

                        console.info(result.links, result.url);

                        for (let i in result.links) {
                            getContentAsHTML(result.links[i], {'selector': options.childSelector})
                                .then((r) => {
                                    let diff = jsdiff.diffChars(t, r.html);

                                    diff.forEach(function(part){
                                        // green for additions, red for deletions
                                        // grey for common parts
                                        var color = part.added ? 'green' :
                                            part.removed ? 'red' : 'grey';
                                        //process.stderr.write(part.value[color]);
                                    });
                                });
                        }

                        /**
                         * meter en bd y para cada uno de los links obtener el content por selector
                         */

                    });

                });
        });
}

function findingStart(url, selector) {
    return new Promise((resolve, reject) => {
        Findings.findAll({
            where: {
                'url': url,
                'selector': selector,
                parent: null
            }
        }).then(function(findings) {
            console.info('Findings que coinciden con url y selector', findings.length);
            if (!findings.length) {
                Findings.create({
                    'url': url,
                    'selector': selector,
                    parent: null,
                    content: null
                }).then((finding) => {
                    console.log('Finding insertado', finding);
                    resolve(finding);
                });
            }
            // Solo debería haber 1...
            if (findings.length > 1) {
                console.warn('Duplicated url, selector found', url, selector);
            }
            resolve(findings[0]);
        });
    });
}

process('https://connect.booking.com/user_guide/site/en-US/api-reference/', 'div.secondary-sidebar-inner.commercial a', {
    childSelector: 'div.content-inner',
    childLimit: 1
});


return;

var t = '            <h1 id="authentication">Authentication<a class="headerlink" href="#authentication" title="Permanent link">&#xB6;</a></h1>\n' +
    '<p>This page explains how to authenticate for the Booking.com Connectivity APIs.</p>\n' +
    '<h2 id="machine-account">Machine account<a class="headerlink" href="#machine-account" title="Permanent link">&#xB6;</a></h2>\n' +
    '<p>You need a <a href="../glossary_of_terms/#machine-account">machine account</a> to use the Booking.com Connectivity APIs. You can create machine accounts in the <a href="https://connect.booking.com">Connectivity Portal</a>.</p>\n' +
    '<p>If you don&apos;t have access to the Connectivity Portal, you&apos;ll need to <a href="https://connect.booking.com">submit your details</a> first.</p>\n' +
    '<h2 id="basic-authentication-scheme">Basic authentication scheme<a class="headerlink" href="#basic-authentication-scheme" title="Permanent link">&#xB6;</a></h2>\n' +
    '<p>The Booking.com Connectivity APIs use the <a href="https://www.w3.org/Protocols/HTTP/1.0/spec.html#BasicAA">HTTP basic authentication scheme</a>. This means you must include an <code>Authorization</code> header in each request, like so:</p>\n' +
    '<pre class="codehilite"><code class="language-http">Authorization: Basic {username:password}</code></pre>\n' +
    '<p><code>{username:password}</code> represents the Base64-encoded (<a href="https://www.ietf.org/rfc/rfc2045.txt">RFC2045-MIME</a>) credentials for your <a href="../glossary_of_terms/#machine-account">machine account</a>.</p>\n' +
    '<h2 id="authentication-failure">Authentication failure<a class="headerlink" href="#authentication-failure" title="Permanent link">&#xB6;</a></h2>\n' +
    '<p>The API returns <code>HTTP 401</code> for failed authentication attempts. The response body will be different for OTA and B.XML endpoints.</p>\n' +
    '<h3 id="bxml-example">B.XML example<a class="headerlink" href="#bxml-example" title="Permanent link">&#xB6;</a></h3>\n' +
    '<pre class="codehilite"><code class="language-xml">&lt;?xml version=&apos;1.0&apos; standalone=&apos;yes&apos;?&gt;\n' +
    '&lt;reservations&gt;\n' +
    '    &lt;fault code=&quot;401&quot;\n' +
    '         string=&quot;Authorization Requir&quot; /&gt;\n' +
    '&lt;/reservations&gt;</code></pre>\n' +
    '<h3 id="ota-example">OTA example<a class="headerlink" href="#ota-example" title="Permanent link">&#xB6;</a></h3>\n' +
    '<pre class="codehilite"><code class="language-xml">&lt;OTA_HotelResModifyNotifRS xmlns=&quot;http://www.opentravel.org/OTA/2003/05&quot; xmlns:xsi=&quot;http://www.w3.org/2001/XMLSchema-instance&quot; xsi:schemaLocation=&quot;http://www.opentravel.org/OTA/2003/05 OTA_HotelResModifyNotifRS.xsd&quot; TimeStamp=&quot;2018-06-22T14:56:37+00:00&quot; Target=&quot;Production&quot; Version=&quot;2.001&quot;&gt;\n' +
    '  &lt;Errors&gt;\n' +
    '    &lt;Error ShortText=&quot;Authorization Required&quot;/&gt;\n' +
    '  &lt;/Errors&gt;\n' +
    '&lt;/OTA_HotelResModifyNotifRS&gt;</code></pre>\n' +
    '<h2 id="troubleshooting">Troubleshooting<a class="headerlink" href="#troubleshooting" title="Permanent link">&#xB6;</a></h2>\n' +
    '<p>If your requests repeatedly fail authentication, check that:</p>\n' +
    '<ul>\n' +
    '<li>your request includes the <code>Authorization</code> header;</li>\n' +
    '<li>your <a href="../glossary_of_terms/#machine-account">majine account</a> credentials are correct;</li>\n' +
    '<li>the <a href="https://connect.booking.com/provider_machine_accounts/">IP whitelist</a> for your machine account is up-to-date;</li>\n' +
    '<li>you have access to the endpoint you&apos;re calling (<a href="https://support.connect.booking.com/hc/en-us/articles/360000992233-Contact-Us">contact us</a> if you&apos;re not sure).</li>\n' +
    '</ul>\n' +
    '<h2 id="legacy-authentication-method">Legacy authentication method changed<a class="headerlink" href="#legacy-authentication-method" title="Permanent link">&#xB6;</a></h2>\n' +
    '<p>B.XML endpoints support an alternative to the <code>Authorization</code>. The header works for these endpoints, but you can also include <code>username</code> and <code>password</code> fields in the request body:</p>\n' +
    '<pre class="codehilite"><code class="language-xml">&lt;?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot;?&gt;\n' +
    '&lt;request&gt;\n' +
    '  &lt;username&gt;username&lt;/username&gt;\n' +
    '  &lt;password&gt;********&lt;/password&gt;\n' +
    '&lt;/request&gt;</code></pre>\n' +
    '<p>We will continue to support this method for the time being, but consider it less secure than the <code>Authorization</code> header. All API users should switch to the header method as soon as possible.</p>\n' +
    '<div class="js-feedback">\n' +
    '    <div class="b-card js-feedback-card">\n' +
    '\t\t<div class="text-featured">Is this page helpful?&#xA0;&#xA0;&#xA0;\n' +
    '          <a target="_blank" href="#" class="js-feedback-card__action" data-track-ga="Page Vote, Yes, Authentication">Yes</a>&#xA0;&#xA0;&#xA0;|&#xA0;&#xA0;&#xA0;\n' +
    '          <a target="_blank" href="#" class="js-feedback-card__action" data-track-ga="Page Vote, No, Authentication">No</a>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '    <div class="b-card js-feedback-response" style="display: none;">\n' +
    '\t\t<div class="text-featured"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="24" height="24"><title>act_review_great</title><g id="_8x" data-name="8x"><path id="act_review_great" d="M64,8a56,56,0,1,0,56,56A56,56,0,0,0,64,8Zm0,104a48,48,0,1,1,48-48A48.05,48.05,0,0,1,64,112ZM44,64a8,8,0,1,1,8-8A8,8,0,0,1,44,64Zm48-8a8,8,0,1,1-8-8A8,8,0,0,1,92,56ZM87.22,77.62a4,4,0,0,1,.61,3.55C86.14,86.65,79,97,64,97c-9.71,0-15.66-4.23-18.94-7.79a22.68,22.68,0,0,1-4.88-8A4,4,0,0,1,44,76H84A4,4,0,0,1,87.22,77.62Z"/></g></svg>\n' +
    '\t\tThanks for your feedback!\n' +
    '\t\t</div>\n' +
    '    </div>\n' +
    '  </div>\n';

function getAnchors(urls, options, callbackSuccess, callbackError)
{
    options = Object.assign({
        select: null,
        allowExternal: false,
        offset: null,
        limit: null
    }, options || {});

    if (typeof urls === 'string') {
        urls = [urls];
    }

    for (let i in urls) {
        if (typeof urls[i] === 'string') {
            urls[i] = {url: urls[i], selector: options.selector}
        }

        _makeRequestAndGetAnchors(urls[i].url, urls[i].selector, options.allowExternal, options.offset, options.limit)
            .then((url, links) => {
                if (typeof callbackSuccess === 'function') {
                    callbackSuccess.apply(null, [url, links]);
                }

            })
            .catch((url, err) => {
                if (typeof callbackError === 'function') {
                    callbackError.apply(null, [url, err]);
                }
            });
    }
}

function getContent(url, options)
{
    return _makeRequestAndGetHtml(url, options.selector);
}

function getContentAsHTML(url, options)
{
    return new Promise(function(resolve, reject) {
        getContent(url, options)
            .then((content) => {
                if (typeof content === 'object') {
                    // Get the HTML
                    let html = content.first().html();
                    // Remove comments
                    html = html.replace(/<!--.*?-->/sg, "");
                    // Remove duplicate spaces
                    html = html.replace(/^\s*[\r\n]/gm, "");

                    resolve({'url': url, 'html': html, 'found': true});
                } else {
                    resolve({'url': url, 'html': '', 'found': false});
                }
            })
            .catch((err) => {
                reject({'url': url, 'err': err});
            });
    });
}

function _makeRequestAndGetAnchors(url, selector, allowExternal, offset, limit)
{
    return new Promise(function(resolve, reject) {
        rp(url)
            .then(function(html){
                let links = [];
                let linksFound = _getAnchors(selector, html);

                for (let i in linksFound) {

                    linksFound[i] = _processLink(url, linksFound[i], allowExternal);
                    if (linksFound[i]) {
                        links.push(linksFound[i]);
                    }
                }

                // Divide
                offset = offset > 0 ? offset - 1 : null;
                limit  = limit  > 0 ? limit      : null;
                if (offset !== null && limit !== null) {
                    links = links.splice(offset, limit);
                } else if (offset !== null) {
                    links = links.splice(offset);
                } else {
                    links.splice(limit);
                }

                resolve({'url': url, 'links': links});
            })
            .catch(function(err){
                reject({'url': url, 'err': err});
            });
    });
}

function _makeRequestAndGetHtml(url, selector)
{
    return new Promise(function(resolve, reject) {
        rp(url)
            .then(function(html){
                let content = $(selector, html);
                resolve(content);
            })
            .catch(function(err){
                reject(err);
            });
    });
}

function _getAnchors(selector, html)
{
    let linksFound = [];
    let links = $(selector, html);

    for (let i in links) {
        if (links[i].type !== 'tag' || links[i].name !== 'a' || typeof links[i].attribs === 'undefined' || typeof links[i].attribs.href === 'undefined') {
            continue;
        }

        let link = links[i].attribs.href;

        if(linksFound.indexOf(link) === -1) {
            linksFound.push(link);
        }
    }

    return linksFound;
}

function _processLink(baseUrl, relativeUrl, allowExternal)
{
    if ((new RegExp("^(http:|https:|ftp:|\/\/)", "i")).test(relativeUrl) && (typeof allowExternal === 'undefined' || !allowExternal)) {
        return null;
    }

    // Self url
    /**
     let test = ['', '.', '..', '../', '/../', '/', '//', '//asd/', '/.', '/?asd', '?asd', '?', '/#aa', '#aaa'];
     for (let i in test) { console.log((new RegExp("^(\\.*$|\/*\.?$|\/?#|\/?\\?.*)", "i")).test(test[i]), test[i]); }
     */
    if (relativeUrl === '' || (new RegExp("^(\\.*$|/*.?$|/?#|/?\\?.*)", "i")).test(relativeUrl)) {
        return null;
    }

    // Go up the path / concatenate
    relativeUrl = baseUrl + relativeUrl;


    return relativeUrl;
}

getAnchors('https://connect.booking.com/user_guide/site/en-US/api-reference/', {
    selector: 'div.secondary-sidebar-inner.commercial a',
    //offset: 2, // number, not index
    limit: 1 // number, not index
}, function (result){

    console.info(result.links, result.url);

    for (let i in result.links) {
        getContentAsHTML(result.links[i], {selector: 'div.content-inner'})
            .then((r) => {
                let diff = jsdiff.diffChars(t, r.html);

                diff.forEach(function(part){
                    // green for additions, red for deletions
                    // grey for common parts
                    var color = part.added ? 'green' :
                        part.removed ? 'red' : 'grey';
                    //process.stderr.write(part.value[color]);
                });
            });
    }

    /**
     * meter en bd y para cada uno de los links obtener el content por selector
     */

});




/*sequelize.sync()
    .then(() => User.create({
        username: 'janedoe',
        birthday: new Date(1980, 6, 20)
    }))
    .then(jane => {
        console.log(jane.toJSON());
    });*/