export function scoreGrade(score) {
  if (score >= 90) {
    return "A";
  } else if (score >= 80) {
    return "B";
  } else if (score >= 60) {
    return "C";
  } else {
    return "D";
  }
}

export function shippingFee(total) {
  if (total >= 6000) {
    return 0;
  } else if (total >= 4000) {
    return 300;
  } else {
    return 600;
  }
}

export function admissionFee(age) {
  if (age < 6) {
    return 0;
  } else if (age < 18) {
    return 500;
  } else if (age < 65) {
    return 1000;
  } else {
    return 700;
  }
}

export function temperatureLabel(temperature) {
  if (temperature < 0) {
    return "氷点下";
  } else if (temperature < 15) {
    return "寒い";
  } else if (temperature < 25) {
    return "穏やか";
  } else {
    return "暑い";
  }
}

export function stockStatus(stock) {
  if (stock <= 0) {
    return "売り切れ";
  } else if (stock < 5) {
    return "残りわずか";
  } else {
    return "在庫あり";
  }
}

export function orderDiscount(count) {
  if (count >= 20) {
    return 500;
  } else if (count >= 10) {
    return 200;
  } else {
    return 0;
  }
}
