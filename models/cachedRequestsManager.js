import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";


let requestsCachesExpirationTime = serverVariables.get("main.requests.CacheExpirationTime");

global.requestsCaches = [];
global.cachedRequestsCleanerStarted = false;

export default class CachedRequestsManager{
    static add(url, content, ETag= "") {
        //Si l'etag est vide on lui en ajoute un
        if(ETag == ""){
            ETag = uuidv1();
        }
        //Si l'intervalle de nettoyage n'est pas commencé, on le commence
        if (!cachedRequestsCleanerStarted) {
            cachedRequestsCleanerStarted = true;
            CachedRequestsManager.startCachedRequestsCleaner();
        }
        if (url != "") {
            CachedRequestsManager.clear(url);
            requestsCaches.push({
                url,
                content,
                ETag,
                Expire_Time: utilities.nowInSeconds() + requestsCachesExpirationTime
            });
            console.log(FgGreen,`Ajout de la cache associé à l'url : ${url}`);
        }
    }
    static startCachedRequestsCleaner() {
        setInterval(CachedRequestsManager.flushExpired, requestsCachesExpirationTime * 1000);
    }
    static find(url) {
        if(url != ""){
            for (let cache of requestsCaches) {
                if (cache.url == url) {
                    cache.Expire_Time = utilities.nowInSeconds() + requestsCachesExpirationTime;
                    return cache;
                }
            }
        }
        return null;
    }
    static clear(url) {
        if (url != "") {
            let indexToDelete;
            //Pour chaque cache on regarde si l'url correspond, si c'est le cas on la supprimme du tableau
            for (let i = 0; i < requestsCaches.length; i++) {
                if (requestsCaches[i].url == url){
                    indexToDelete = i;
                    break;
                }
            }
            if(indexToDelete != null){
                utilities.deleteByIndex(repositoryCaches, indexToDelete);
                console.log(FgRed, "Retrait de la cache associé à l'url : " + url);
            }
        }
    }
    static flushExpired() {
        let now = utilities.nowInSeconds(); //Temps actuel
        //Pour chaque cache, on regarde si le temps d'expiration est passée et on met un message à la console, puis on filtre
        for (let cache of requestsCaches) {
            if (cache.Expire_Time <= now) {
                console.log(BgWhite + FgRed, "Retrait de la cache associé à l'url (Délai Dépassé) : " + cache.url);
            }
        }
        //On ne prend que les caches où le temps d'expiration est plus grand que le temps actuel
        requestsCaches = requestsCaches.filter( cache => cache.Expire_Time > now);
    }
    static get(HttpContext) {
        return new Promise(async resolve => {
            if (!HttpContext.path.isAPI) {
                resolve(false);
            } else{
                if(HttpContext.req.method == "GET"){
                    let cache = CachedRequestsManager.find(HttpContext.req.url);
                    //si on a trouvé une cache
                    if(cache != undefined){
                        console.log(FgBlue, "Extraction de la cache associé à l'url : " + cache.url);
                        HttpContext.response.JSON(cache.content, cache.ETag, true);
                        resolve(true);
                    }
                    else{
                        resolve(false);
                    }
                } 
                else {
                    resolve(false);
                }
            }
        });     
    }

}
