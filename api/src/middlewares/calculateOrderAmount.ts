const itemIdToPrice: { [id: string]: number } = {
    'id-1': 1400,
    'id-2': 2000,
    'id-3': 3000,
    'id-4': 4000,
    'id-5': 5000,
};
  
const calculateOrderAmount = (itemIds: string[] = ['id-1']): number => {
    const total = itemIds
      .map((id) => itemIdToPrice[id])
      .reduce((prev, curr) => prev + curr, 0);
  
    return total;
};

export { calculateOrderAmount }