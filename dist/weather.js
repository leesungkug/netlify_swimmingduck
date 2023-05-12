//좌표 변환
let RE = 6371.00877; // 지구 반경(km)
let GRID = 5.0; // 격자 간격(km)
let SLAT1 = 30.0; // 투영 위도1(degree)
let SLAT2 = 60.0; // 투영 위도2(degree)
let OLON = 126.0; // 기준점 경도(degree)
let OLAT = 38.0; // 기준점 위도(degree)
let XO = 43; // 기준점 X좌표(GRID)
let YO = 136; // 기준점 Y좌표(GRID)
//
// LCC DFS 좌표변환 ( code : "toXY"(위경도->좌표, v1:위도, v2:경도), "toLL"(좌표->위경도,v1:x, v2:y) )
//


function dfs_xy_conv(code, v1, v2) {
    let DEGRAD = Math.PI / 180.0;
    let RADDEG = 180.0 / Math.PI;

    let re = RE / GRID;
    let slat1 = SLAT1 * DEGRAD;
    let slat2 = SLAT2 * DEGRAD;
    let olon = OLON * DEGRAD;
    let olat = OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);
    let rs = {};
    if (code == "toXY") {
        rs['lat'] = v1;
        rs['lng'] = v2;
        let ra = Math.tan(Math.PI * 0.25 + (v1) * DEGRAD * 0.5);
        ra = re * sf / Math.pow(ra, sn);
        let theta = v2 * DEGRAD - olon;
        if (theta > Math.PI) theta -= 2.0 * Math.PI;
        if (theta < -Math.PI) theta += 2.0 * Math.PI;
        theta *= sn;
        rs['x'] = Math.floor(ra * Math.sin(theta) + XO + 0.5);
        rs['y'] = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
    }
    else {
        rs['x'] = v1;
        rs['y'] = v2;
        let xn = v1 - XO;
        let yn = ro - v2 + YO;
        ra = Math.sqrt(xn * xn + yn * yn);
        if (sn < 0.0) - ra;
        let alat = Math.pow((re * sf / ra), (1.0 / sn));
        alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;

        if (Math.abs(xn) <= 0.0) {
            theta = 0.0;
        }
        else {
            if (Math.abs(yn) <= 0.0) {
                theta = Math.PI * 0.5;
                if (xn < 0.0) - theta;
            }
            else theta = Math.atan2(xn, yn);
        }
        let alon = theta / sn + olon;
        rs['lat'] = alat * RADDEG;
        rs['lng'] = alon * RADDEG;
    }
    return rs;
}

export class WeatherAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.data = -1;
        this.tmp = -1;
        this.rain = -1;
        this.sky = -1;
        this.rain_state = -1;
        this.time = -1;
        this.realtime = -1;
        this.day = -1;
    }

    async fetchWeatherData(latitude, longitude) {

        let ForecastGribURL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
        ForecastGribURL += "\?ServiceKey="; 
        ForecastGribURL += this.apiKey;
        ForecastGribURL += "&pageNo=1&numOfRows=30";        
        ForecastGribURL += "&dataType=json";
        ForecastGribURL += "&base_date=" + this.day;
        ForecastGribURL += "&base_time=" + this.time;
        ForecastGribURL += "&nx=" + latitude + "&ny=" + longitude;
        const response = await fetch(ForecastGribURL);
        const data = await response.json();
        return (data);
    }

    getdaytime() {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        
        const currentYear = currentTime.getFullYear();
        const currentMonth = currentTime.getMonth() + 1; // 월은 0부터 시작하므로 1을 더해줍니다.
        const currentDay = currentTime.getDate();
        this.day = currentYear;
        if(currentMonth < 10)
            this.day += "0";
        this.day += `${currentMonth}`;
        this.day += `${currentDay}`;
        this.realtime = `${currentHour}` + "00";
        let t = (Math.floor(currentHour / 3) - 1 );
        if (t == -1 && currentHour != 3)
        {
            t = 7;
            this.day -= 1;
        }
        else if (t == -1 && currentHour >= 3)
            t = 0;
        this.time = t * 3 + 2;
        if (this.time < 10)
            this.time = ("0" + this.time);
        if (this.realtime < 10)
            this.realtime = ("0" + this.realtime);

        this.time += "00";
        console.log("time: ", this.time);
        console.log("day", this.day);
        console.log("realtime: ", this.realtime);
    }

    async getWeatherData() {
        navigator.geolocation.getCurrentPosition(async (position) => {
            this.getdaytime();
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;  
            const re = dfs_xy_conv("toXY", latitude, longitude);         
            this.data = await this.fetchWeatherData(re['x'], re['y']);
            // console.log(this.data);
            const arr = this.data.response.body.items.item;
            const curarr = arr.filter(obj => obj.fcstTime == this.realtime)
            // console.log(curarr);
            this.tmp = curarr[0].fcstValue;
            this.sky = curarr[5].fcstValue;
            this.rain_state = curarr[6].fcstValue;
            this.rain = curarr[7].fcstValue;
        });
    }
}