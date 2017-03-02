'use strict';

const request = require('superagent');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = `http://jandan.net/ooxx`;
let linksArray = [];

// 获取页面
function requestHtml(page) {
    let url = `${URL}/page-${page}#comments`;
    return request.get(url).then(res => res.text);
}

// 解析图片链接
function getLinks(html) {
    let $ = cheerio.load(html);
    return Array.from($('.commentlist li').map(function () {
        return $(this).find('.view_img_link').attr('href');
    }));
}

// 下载图片
function downloadImg(url) {
    // 处理url
    url = 'http:' + url;
    console.log(`下载${url}`);
    let filePath = `./meizi/${url.substr(-26)}`;
    let stream = fs.createWriteStream(filePath);
    request.get(url).pipe(stream);
}

// 限流器
function timeChunk(any, fn, limit, wait = 0) {
    let run = async function () {
        if (!any.length) return;

        // 延时等待 随机为0到wait毫秒
        await (new Promise((resolve, reject) => setTimeout(resolve, ~~(Math.random() * wait))));

        // 每次取出 limit 数量的任务
        let params = any.splice(0, limit);
        params.forEach((param) => fn(param));
        return run();
    }
    return run();
}

// 获取每页数据
async function getLinksByPage(page) {
    try {
        console.log(`获取页面->当前第${page}页`);
        let html = await requestHtml(page);

        console.log('解析数据');
        let links = getLinks(html);

        Array.prototype.push.apply(linksArray, links);

        if (html.includes('«')) {
            return getLinksByPage(++page);
        }

        console.log(linksArray);
        return linksArray;
    } catch (error) {
        console.log(error.message);

        // 出现错误跳过当前页,继续抓取下一页
        return getLinksByPage(++page);
    }
}

(async () => {
    try {
        let links = await getLinksByPage(1);
        await timeChunk(links, downloadImg, 5, 3000);

        console.log('抓取完成');
    } catch (error) {
        console.error(error);
    }
})();