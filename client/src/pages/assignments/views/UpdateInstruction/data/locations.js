export const fetchStartingPoints = async ({
  api,
  instructionId,
  setStartingPoints,
}) => {
  try {
    const response = await api.get("/starting-points");
    const driverRatePoints = response.data;
    console.log("Starting points from m5_driver_rate:", driverRatePoints);

    let legStartingPoints = [];
    if (instructionId) {
      try {
        const legResponse = await api.get(`/legs/${instructionId}`);
        const legData = legResponse.data;
        legStartingPoints = [
          ...new Set(legData.map((leg) => leg.startingpoint).filter(Boolean)),
        ];
        console.log("Starting points from saved legs:", legStartingPoints);
      } catch (error) {
        console.error("Error fetching starting points from legs:", error);
      }
    }

    const allStartingPoints = [...new Set([...driverRatePoints, ...legStartingPoints])];
    console.log("Combined starting points:", allStartingPoints);

    setStartingPoints(allStartingPoints);
  } catch (error) {
    console.error("Error fetching starting points:", error);
  }
};

export const fetchDestinations = async ({
  api,
  instructionId,
  setDestinations,
}) => {
  try {
    const response = await api.get("/destinations");
    const driverRateDestinations = response.data;
    console.log("Destinations from m5_driver_rate:", driverRateDestinations);

    let legDestinations = [];
    if (instructionId) {
      try {
        const legResponse = await api.get(`/legs/${instructionId}`);
        const legData = legResponse.data;
        legDestinations = [
          ...new Set(legData.map((leg) => leg.destination).filter(Boolean)),
        ];
        console.log("Destinations from saved legs:", legDestinations);
      } catch (error) {
        console.error("Error fetching destinations from legs:", error);
      }
    }

    const allDestinations = [...new Set([...driverRateDestinations, ...legDestinations])];
    console.log("Combined destinations:", allDestinations);

    setDestinations(allDestinations);
  } catch (error) {
    console.error("Error fetching destinations:", error);
  }
};
