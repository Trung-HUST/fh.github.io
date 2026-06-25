import { useState, useEffect } from "react";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { MatrixButton } from "@/components/ui/MatrixButton";
import { useTranslation } from "react-i18next";

interface HourlyForecast {
  time: string;
  temp: number;
  code: number;
}

interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  code: number;
}

interface WeatherData {
  temp: number;
  windSpeed: number;
  humidity: number;
  code: number;
  timestamp: number;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

const CACHE_KEY = "matrix_weather_cache_v2";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getWeatherLabel(code: number, t: any): string {
  if (code === 0) return t("weather.clear", "CLEAR SKY");
  if (code === 1 || code === 2 || code === 3) return t("weather.cloudy", "CLOUDY");
  if (code === 45 || code === 48) return t("weather.fog", "FOG");
  if (code >= 51 && code <= 55) return t("weather.drizzle", "DRIZZLE");
  if (code >= 61 && code <= 65) return t("weather.rain", "RAIN");
  if (code >= 80 && code <= 82) return t("weather.rain", "RAIN");
  if (code >= 71 && code <= 75) return t("weather.snow", "SNOW");
  if (code === 95 || code === 96 || code === 99) return t("weather.thunderstorm", "THUNDERSTORM");
  return t("weather.unknown", "UNKNOWN");
}

export function WeatherWidget() {
  const { t } = useTranslation();
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "loading" | "error" | "denied">("idle");

  useEffect(() => {
    // Check cache on mount
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as WeatherData;
        if (Date.now() - parsed.timestamp < CACHE_DURATION_MS && parsed.hourly && parsed.daily && parsed.humidity !== undefined) {
          setData(parsed);
          return;
        }
      } catch (e) {
        // Ignore cache error
      }
    }
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    setStatus("loading");
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&current=apparent_temperature,relative_humidity_2m&hourly=temperature_2m,relative_humidity_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
      if (!res.ok) throw new Error("API Error");
      
      const json = await res.json();
      
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const localHourStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
      let currentHourIndex = json.hourly.time.findIndex((t: string) => t.startsWith(localHourStr));
      if (currentHourIndex === -1) currentHourIndex = 0;

      const hourly = [];
      for(let i=currentHourIndex; i<currentHourIndex+4; i++) {
        if(json.hourly.time[i]) {
          hourly.push({
            time: json.hourly.time[i],
            temp: json.hourly.temperature_2m[i],
            code: json.hourly.weathercode[i]
          });
        }
      }

      const daily = [];
      for(let i=0; i<4; i++) {
        if(json.daily.time[i]) {
          daily.push({
            date: json.daily.time[i],
            maxTemp: json.daily.temperature_2m_max[i],
            minTemp: json.daily.temperature_2m_min[i],
            code: json.daily.weathercode[i]
          });
        }
      }

      const weatherData: WeatherData = {
        temp: json.current?.apparent_temperature ?? json.current_weather.temperature,
        windSpeed: json.current_weather.windspeed,
        humidity: json.current?.relative_humidity_2m ?? json.hourly.relative_humidity_2m[currentHourIndex],
        code: json.current_weather.weathercode,
        timestamp: Date.now(),
        hourly,
        daily
      };
      
      setData(weatherData);
      localStorage.setItem(CACHE_KEY, JSON.stringify(weatherData));
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  const requestLocation = () => {
    setStatus("requesting");
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setStatus("denied");
      }
    );
  };

  return (
    <AsciiBox title={t("dashboard.localConditions", "LOCAL CONDITIONS")} subtitle="weather" className="h-full">
      <div className="flex flex-col justify-center h-full min-h-[140px] px-2 font-mono">
        {!data && status === "idle" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-2">
            <span className="text-xs text-matrix-muted text-center leading-tight">
              {t("weather.noSignal", "// no local atmospheric data //")}
            </span>
            <MatrixButton onClick={requestLocation} className="text-xs">
              [ {t("weather.enableSensor", "ENABLE LOCATION SENSOR")} ]
            </MatrixButton>
          </div>
        )}

        {status === "requesting" && (
          <div className="flex items-center justify-center h-full text-matrix-dim animate-pulse text-sm text-center">
            {t("weather.awaitingPermission", "> AWAITING SENSOR PERMISSION...")}
          </div>
        )}

        {status === "loading" && (
          <div className="flex items-center justify-center h-full text-matrix-bright animate-pulse text-sm text-center">
            {t("weather.fetching", "> CONNECTING TO METEO SATELLITE...")}
          </div>
        )}

        {status === "denied" && (
          <div className="flex flex-col items-center justify-center space-y-2 h-full">
            <span className="text-xs text-red-500">{t("weather.accessDenied", "[ ACCESS DENIED ]")}</span>
            <MatrixButton onClick={requestLocation} className="text-[10px]">
              [ {t("weather.retry", "RETRY")} ]
            </MatrixButton>
          </div>
        )}
        
        {status === "error" && (
          <div className="flex items-center justify-center h-full text-red-500 text-xs">
            {t("weather.apiError", "[ CONNECTION FAILED ]")}
          </div>
        )}

        {data && status === "idle" && (
          <div className="flex flex-row gap-2 md:gap-4 py-1 h-full w-full justify-between">
            {/* Left Col: Current Weather */}
            <div className="flex flex-col gap-1 min-w-[100px] md:min-w-[120px]">
              <span className="text-4xl text-matrix-primary font-bold tracking-tighter">
                {Math.round(data.temp)}°C
              </span>
              <span className="text-xs text-matrix-primary uppercase truncate" title={getWeatherLabel(data.code, t)}>
                [ {getWeatherLabel(data.code, t)} ]
              </span>
              
              <div className="w-full h-px bg-matrix-ghost/30 my-1" />
              
              <div className="flex items-center text-xs text-matrix-dim">
                <span>{t("weather.wind", "WIND")}: {Math.round(data.windSpeed)} km/h</span>
              </div>
              <div className="flex items-center text-xs text-matrix-dim mt-1">
                <span>{t("weather.humidity", "HUMIDITY")}: {Math.round(data.humidity)}%</span>
              </div>
              <div className="mt-auto pt-1">
                <button 
                  onClick={requestLocation}
                  className="text-[10px] text-matrix-dim hover:text-matrix-primary transition-colors hover:underline cursor-pointer uppercase"
                >
                  [{t("weather.sync", "SYNC")}]
                </button>
              </div>
            </div>

            {/* Right Side: Hourly and Daily Stacked */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 border-l border-matrix-ghost/30 pl-2 md:pl-4">
              
              {/* Top: Hourly */}
              <div className="flex flex-col">
                <span className="text-[10px] text-matrix-muted uppercase mb-1">{t("weather.hourlyForecast", "HOURLY FORECAST")}</span>
                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-1">
                  {data.hourly.map((h, i) => {
                    const date = new Date(h.time);
                    const hourStr = date.getHours().toString().padStart(2, '0') + ":00";
                    return (
                      <div key={i} className="flex flex-col items-center min-w-[40px]">
                        <span className="text-[10px] text-matrix-dim">{i === 0 ? t("weather.now", "Now") : hourStr}</span>
                        <span className="text-sm text-matrix-primary my-1 font-bold">{Math.round(h.temp)}°</span>
                        <span className="text-[10px] text-matrix-muted truncate max-w-[45px] text-center" title={getWeatherLabel(h.code, t)}>
                          {getWeatherLabel(h.code, t).split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom: Daily */}
              <div className="flex flex-col mt-auto">
                <span className="text-[10px] text-matrix-muted uppercase mb-1">{t("weather.dailyForecast", "DAILY FORECAST")}</span>
                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-1">
                  {data.daily.map((d, i) => {
                    const date = new Date(d.date);
                    const dayStr = date.toLocaleDateString(t("weather.localeCode", "en-US"), { weekday: 'short' });
                    return (
                      <div key={i} className="flex flex-col items-center min-w-[40px]">
                        <span className="text-[10px] text-matrix-dim">{i === 0 ? t("weather.today", "Today") : dayStr}</span>
                        <div className="flex items-center gap-1 my-1 text-[10px]">
                          <span className="text-matrix-primary font-bold">{Math.round(d.maxTemp)}°</span>
                          <span className="text-matrix-muted">{Math.round(d.minTemp)}°</span>
                        </div>
                        <span className="text-[10px] text-matrix-muted truncate max-w-[45px] text-center" title={getWeatherLabel(d.code, t)}>
                          {getWeatherLabel(d.code, t).split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </AsciiBox>
  );
}
