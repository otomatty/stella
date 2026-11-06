// 関数宣言は巻き上げられるので、宣言より前の行からも呼べる。アロー関数は this を持たず、宣言より前では使えない
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function celsiusToFahrenheit(celsius: number): number {
  return round2((celsius * 9) / 5 + 32);
}

export const fahrenheitToCelsius = function (fahrenheit: number): number {
  return round2(((fahrenheit - 32) * 5) / 9);
};

export const kelvinToCelsius = (kelvin: number): number => round2(kelvin - 273.15);

export const convert = (value: number, from: "C" | "F" | "K", to: "C" | "F" | "K"): number => {
  let celsius = value;
  if (from === "F") {
    celsius = fahrenheitToCelsius(value);
  } else if (from === "K") {
    celsius = kelvinToCelsius(value);
  }
  if (to === "F") {
    return celsiusToFahrenheit(celsius);
  }
  if (to === "K") {
    return round2(celsius + 273.15);
  }
  return celsius;
};
