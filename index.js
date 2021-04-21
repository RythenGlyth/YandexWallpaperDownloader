const axios = require("axios").default;
const fs = require("fs");
const {DownloadWorker, utils} = require("rapid-downloader");
const async = require("async_hooks")
const proxies = fs.readFileSync("proxies.txt").toString().split("\n").map(p => p.split(":"))


var queue = [];
addQueue = (items) => {
    queue.push(items);
    tryStartTask()
}
var currentWorking = 0;
var fetching = true;
new Promise((ores, orej) => {
    axios("https://browser.yandex.com/wallpapers/api/rotate/?hires=true&lang=en&list-ids=").then(res => {
        Promise.all(res.data.filter((a, x) => true).map(element => {
            return new Promise((res, rej) => {
                axios("https://browser.yandex.com/wallpapers/api/rotate/?hires=true&lang=en&current=&id=" + element).then(r => {
                    var name = r.data.id + (r.data.extendedInfo && r.data.extendedInfo.pictureInfo && r.data.extendedInfo.pictureInfo.title ? " - " + r.data.extendedInfo.pictureInfo.title : "");
                    var arr = [];
                    if(r.data.videoUrls) {
                        Object.keys(r.data.videoUrls).forEach(v => {
                            addQueue({name: __dirname + "/out/" + name + "/video-" + v + "." + r.data.videoUrls[v].split(".").slice(-1)[0], url: r.data.videoUrls[v]})
                        })
                    }
                    addQueue({name: __dirname + "/out/" + name + "/picture.jpg", url: r.data.pictureUrl})
                    fs.mkdirSync(__dirname + "/out/" + name, {
                        recursive: true
                    });
                    res();
                });
            });
        })).then(ores);
    })
}).then(() => {
    fetching = false;
});

function startTask() {
    let el = queue.shift();
    currentWorking++;
    console.log("start downloading " + el.url);
    axios.get(el.url, {
        responseType: "stream",
    }).then(res => {
        var stream = res.data.pipe(fs.createWriteStream(el.name))
        stream.on('finish', () => {
            currentWorking--;
            console.log("finished " + el.name + " " + queue.length + " to go")
            tryStartTask();
        });
    });
}

const simultanious = 5;

function tryStartTask() {
    if(queue.length > 0 && currentWorking < simultanious) {
        startTask();
        return true;
    }
    return false;
}