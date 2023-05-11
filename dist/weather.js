export class WeatherAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async fetchWeatherData(latitude, longitude) {
        console.log(latitude);
        let apikey = "HqBrGQAZCs7F7Ho61Lri4K4z%2Bk1rXJfsXL6YGpw5lQjfSgYO6cl%2FIZze%2FSu9WT80mWfaKvwEbfeKFZT5UbytKw%3D%3D";
        let ForecastGribURL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
        ForecastGribURL += "?ServiceKey=" + apikey;
        ForecastGribURL += "&base_date=20230510";
        ForecastGribURL += "&base_time=0500";
        ForecastGribURL += "&nx=" + latitude + "&ny=" + longitude;
        ForecastGribURL += "&pageNo=1&numOfRows=7";
        ForecastGribURL += "&_type=json";
        const response = await fetch(ForecastGribURL);
        const data = await response.json();
        return data;
    }

    getWeatherData() {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const weatherData = await this.fetchWeatherData(latitude, longitude);
            console.log(weatherData);
        });
    }
}