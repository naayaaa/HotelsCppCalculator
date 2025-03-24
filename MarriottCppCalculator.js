// ==UserScript==
// @name         CPP Calculator: Marriott
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       jkz
// @description  Calculate and display marriott cpp values.
// @include      *://*.marriott.*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Logging constants.
  const INFO = "[jkz][INFO]";
  const WARNING = "[jkz][INFO]";
  const ERROR = "[jkz][ERROR]";

  // HTML element constants.
  const kPropertyClass = "property-card";
  const kDateButtonQuery = ".date-button";
  const kDateTextQuery = ".search-page-date-text";
  const kPropertyTitleQuery = ".title-container";
  const kPointsValueQuery = ".points-value";
  const kPriceValueQuery = ".price-value";
  const kCppDivClass = "jk-marriott-cpp-result";

  // Display constants.
  const kCrappyHotelCppThreshold = 0.7;
  const kNiceHotelCppThreshold = 0.9;
  const kFantasticHotelCppThreshold = 1.0;

  // Function to calculate the difference in days between two dates
  function calculateDaysBetweenDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDifference = end.getTime() - start.getTime();
    return timeDifference / (1000 * 3600 * 24); // ms to days
  }

  function calculateAndMarkCpp(remove_mediocre_hotels = false) {
    console.log(`${INFO} Calculating cpp values..`);

    // Extract days to stay.
    const datesElement = document.querySelectorAll(kDateButtonQuery);
    const checkInDate = datesElement[0]
      ?.querySelector(kDateTextQuery)
      ?.textContent.trim();
    const checkOutDate = datesElement[1]
      ?.querySelector(kDateTextQuery)
      ?.textContent.trim();
    if (!checkInDate || !checkOutDate) {
      console.log(`${ERROR} Unable to extract dates.`);
      return;
    }
    const daysBetween = calculateDaysBetweenDates(checkInDate, checkOutDate);
    if (daysBetween < 1) {
      console.log(`${ERROR} Invalid days: ${daysBetween}`);
      return;
    }

    // Wipe-out existing result, if any.
    document.querySelectorAll(`.${kCppDivClass}`).forEach((el) => el.remove());

    // Iterate all properties.
    const propertyElements = document.querySelectorAll(`.${kPropertyClass}`);
    console.log(`${INFO} Iterating ${propertyElements.length} properties..`);
    propertyElements.forEach((block) => {
      // Title.
      let propertyName = block.querySelector(kPropertyTitleQuery)?.textContent;
      if (!propertyName) {
        console.log(`${WARNING} Unable to find the property name.`);
        propertyName = "Unkown Hotel";
      }
      console.log(`${INFO} Processing ${propertyName}.`);

      // Points && Prices.
      const pointsElement = block.querySelector(kPointsValueQuery);
      const priceElement = block.querySelector(kPriceValueQuery);
      if (!pointsElement || !priceElement) {
        console.log(
          `${ERROR} Unable to find price and point for ${propertyName}.`
        );
        if (remove_mediocre_hotels) {
          block.remove();
        }
        return;
      }

      // CPP.
      const pointsValue = parseInt(
        pointsElement.textContent.replaceAll(",", "")
      );
      const priceValue = parseInt(priceElement.textContent.replaceAll(",", ""));
      if (pointsValue <= 0) {
        console.log(
          `${ERROR} Invalid pointsValue: ${pointsElement.textContent} on ${propertyName}.`
        );
        return;
      }
      const cpp = (100 * priceValue) / (pointsValue / daysBetween);

      // Mark.
      const resultElement = document.createElement("span");
      resultElement.classList.add(kCppDivClass);
      resultElement.textContent = `(${cpp.toFixed(2)}cpp)`;
      if (cpp <= kCrappyHotelCppThreshold) {
        resultElement.style.color = "grey";
        resultElement.style.fontWeight = "normal";
        block.style.cssText = `text-decoration: line-through`;
      }
      if (cpp < kNiceHotelCppThreshold && remove_mediocre_hotels) {
        console.log(`${INFO} Mediocre hotel ${propertyName} removed.`);
        block.remove();
        return;
      }
      if (cpp >= kNiceHotelCppThreshold) {
        resultElement.style.color = "red";
        resultElement.style.fontWeight = "bold";
      }
      if (cpp >= kFantasticHotelCppThreshold) {
        resultElement.style.backgroundColor = "yellow";
        resultElement.style.fontWeight = "bold";
      }
      pointsElement.parentElement.insertBefore(resultElement, pointsElement);
    });
  }

  // calculateAndMarkCpp();
  // setInterval(calculateAndMarkCpp, 5000); // Run every 10 seconds

  // Refresh.
  const kButtonCommonCss = `
        position: fixed;
        font-family: "Open Sans", sans-serif;
        font-size: 14px;
        padding: 10px 20px;
        background: black;
        color: white;
        border: none;
        border-radius: 5px;
        box-shadow: 0px 4px 6px rgba(0,0,0,0.1);
        cursor: pointer;
        z-index: 9999999999;
    `;

  function createRefreshButton() {
    const button = document.createElement("button");
    button.innerText = "Refresh Calculations";
    button.id = "RefreshButton";
    button.style.cssText = kButtonCommonCss;
    button.style.bottom = "70px";
    button.style.right = "20px";

    button.addEventListener("click", function () {
      calculateAndMarkCpp();
    });
    document.body.appendChild(button);
  }
  createRefreshButton();

  // Refresh && Remove.
  function createRemoveButton() {
    const button = document.createElement("button");
    button.innerText = "Remove Mediocre Hotels";
    button.id = "RemvoeCrappyHotelsButton";
    button.style.cssText = kButtonCommonCss;
    button.style.bottom = "20px";
    button.style.right = "20px";

    button.addEventListener("click", function () {
      calculateAndMarkCpp(true);
    });
    document.body.appendChild(button);
  }
  createRemoveButton();

  // Run script when kPropertyClass have changed.
  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      let refresh = false;
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList.contains(kPropertyClass)) {
          refresh = true;
          return;
        }
      });

      if (!refresh) {
        console.log(`${INFO} Skip an unrelated change.`);
        return;
      }
      calculateAndMarkCpp();
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
})();
