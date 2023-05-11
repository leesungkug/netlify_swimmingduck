export class WeatherAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.data = 0;
        console.log(this.apiKey);
    }

    async fetchWeatherData(latitude, longitude) {
        console.log(latitude);
        // let apikey = "HqBrGQAZCs7F7Ho61Lri4K4z%2Bk1rXJfsXL6YGpw5lQjfSgYO6cl%2FIZze%2FSu9WT80mWfaKvwEbfeKFZT5UbytKw%3D%3D";
        let ForecastGribURL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
        ForecastGribURL += "\?ServiceKey="; 
        ForecastGribURL += this.apiKey;
        ForecastGribURL += "&pageNo=1&numOfRows=1000";        
        ForecastGribURL += "&dataType=json";
        ForecastGribURL += "&base_date=20230511";
        ForecastGribURL += "&base_time=2300";
        ForecastGribURL += "&nx=" + latitude + "&ny=" + longitude;
        const response = await fetch(ForecastGribURL);
        const data = await response.json();
        return (data);
    }

    async getWeatherData() {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latitude = Math.ceil(position.coords.latitude);
            const longitude = Math.ceil(position.coords.longitude);            
            this.data = await this.fetchWeatherData(latitude, longitude);
            console.log(this.data);
        });
    }
}