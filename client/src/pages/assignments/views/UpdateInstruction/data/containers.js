export const fetchAllContainers = async ({ api, setContainerOptions }) => {
  try {
    const response = await api.get("/containers/numbers");
    const data = response.data;
    console.log("All container numbers:", data);
    setContainerOptions(data);
  } catch (error) {
    console.error("Error fetching container numbers:", error);
  }
};

export const fetchContainersForInstruction = async ({
  api,
  instructionId,
  isWeightBased,
  setInstructionContainers,
  setContainerDetailsMap,
  setContainerOptions,
  fetchAllContainersFallback,
}) => {
  try {
    if (!isWeightBased) {
      const response = await api.get(`/containers/instruction/${instructionId}`);
      const data = response.data;
      console.log("Containers for instruction:", data);

      setInstructionContainers(data);

      const containerMap = {};
      data.forEach((container) => {
        containerMap[container.containernum.toString()] = {
          type: container.container_type || "",
          weight: container.weight,
          dropoff: container.dropoff,
        };
      });
      setContainerDetailsMap(containerMap);
      console.log("Container details map:", containerMap);

      setContainerOptions(data.map((container) => container.containernum.toString()));
    } else {
      setInstructionContainers([]);
      setContainerDetailsMap({});
      setContainerOptions([]);
      console.log("Weight-based instruction - skipping container fetch");
    }
  } catch (error) {
    console.error("Error fetching containers for instruction:", error);
    if (!isWeightBased && fetchAllContainersFallback) {
      fetchAllContainersFallback();
    }
  }
};
