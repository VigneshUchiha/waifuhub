
let reloadButton = document.getElementById('reload');
reloadButton.addEventListener('click', newImage);

let currApi = "https://api.waifu.pics/sfw/waifu";
let api = 1;

let categories = document.getElementById('categories');

document.getElementById('api1').addEventListener('click',() =>{
    currApi = "https://api.waifu.pics/sfw/waifu";
    api = 1;
    categories.innerHTML = `<a href="" id="waifu">waifu</a>
    <a href="" id="neko">neko</a>
    <a href="" id="cuddle">cuddle</a>
    <a href="" id="cry">cry</a>
    <a href="" id="handhold">handhold</a>`;
})


document.getElementById('api2').addEventListener('click',() =>{
    currApi = "https://api.waifu.im/search/?included_tags=uniform";
    api = 2;
    categories.innerHTML = `<a href="" id="uniform">default</a>`;
})

// for api1 categories

let waifu = document.getElementById('waifu');
let neko = document.getElementById('neko');
let cuddle = document.getElementById('cuddle');
let cry = document.getElementById('cry');
let handhold = document.getElementById('handhold');

waifu.addEventListener("click", () =>{
    currApi = "https://api.waifu.pics/sfw/waifu";
    newImage();
});
neko.addEventListener("click", () =>{
    currApi = "https://api.waifu.pics/sfw/neko";
    newImage();
});
cuddle.addEventListener("click", () =>{
    currApi = "https://api.waifu.pics/sfw/cuddle";
    newImage();
});
cry.addEventListener("click", () =>{
    currApi = "https://api.waifu.pics/sfw/cry";
    newImage();
});
handhold.addEventListener("click", () =>{
    currApi = "https://api.waifu.pics/sfw/handhold";
    newImage();
});
// ap2 categories
uniform.addEventListener("click", () =>{
    currApi = "https://api.waifu.im/search/?included_tags=uniform";
    newImage();
});

function newImage(){
    let url = currApi;
    fetch(url).then((data) => {
        return data.json();
    })
    .then((data) => {
        console.log(data);
        if(api === 1){
            document.getElementById("maarcho").src = data.url;
        }
        else if(api == 2){
            document.getElementById("maarcho").src = data.images[0].url;
        }
    })
    .catch((err) =>{
        console.log(err);
    })
}
