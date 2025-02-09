import React, { useContext, useState, useEffect } from "react";
import { View, Dimensions, StyleSheet, Text, FlatList } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { BarChart, PieChart } from "react-native-chart-kit";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ExpenseContext } from "../../context/expenseContext";
import {
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  getWeekOfMonth,
  parseISO,
  isWithinInterval,
  format,
  subMonths,
  addMonths,
} from "date-fns";
import NavigationArrows from "./utils/NavigationArrows";
import Footer from "../../components/Footer";
import Header from "../../components/Header";

const screenWidth = Dimensions.get("window").width;

const MonthlyChart = () => {
  const { transactions } = useContext(ExpenseContext);
  const navigation = useNavigation();
  const route = useRoute();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedChart, setSelectedChart] = useState("monthly");

  useEffect(() => {
    if (route.params && route.params.selectedMonth) {
      setCurrentMonth(new Date(route.params.selectedMonth));
    }
  }, [route.params]);

  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);

  const currentMonthTransactions = transactions.filter(
    (transaction) =>
      transaction.transaction_type === "debit" &&
      isWithinInterval(parseISO(transaction.transaction_date), {
        start: currentMonthStart,
        end: currentMonthEnd,
      })
  );

  const monthlyData = processMonthlyData(currentMonthTransactions);
  const totalExpense = currentMonthTransactions.reduce(
    (acc, transaction) => acc + transaction.amount,
    0
  );
  const categoryData = processCategoryData(currentMonthTransactions);

  const chartConfig = {
    backgroundColor: "#002663", // Set the background color of the chart
    backgroundGradientFrom: "#002663", // Set the gradient start color
    backgroundGradientTo: "#016fd0",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // solid background lines with no dashes
    },
  };

  const handlePreviousMonth = () => {
    const previousMonth = subMonths(currentMonth, 1);
    setCurrentMonth(previousMonth);
    navigation.navigate("MonthlyChart", {
      selectedMonth: previousMonth.toISOString(),
    });
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    setCurrentMonth(nextMonth);
    navigation.navigate("MonthlyChart", {
      selectedMonth: nextMonth.toISOString(),
    });
  };

  const handleChartChange = (value) => {
    setSelectedChart(value);
    if (value === "daily") {
      navigation.navigate("DailyChart");
    } else if (value === "weekly") {
      navigation.navigate("WeeklyChart");
    } else if (value === "monthly") {
      navigation.navigate("MonthlyChart");
    }
  };

  const renderHeader = () => {
    return (
      <View style={styles.scrollContainer}>
        <Picker
          selectedValue={selectedChart}
          onValueChange={handleChartChange}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Daily" value="daily" />
          <Picker.Item label="Weekly" value="weekly" />
          <Picker.Item label="Monthly" value="monthly" />
        </Picker>
        <View style={styles.navigation}>
          <NavigationArrows
            onPrevious={handlePreviousMonth}
            onNext={handleNextMonth}
            currentDate={currentMonth}
          />
        </View>
        <Text style={styles.chartTitle}>
          Monthly Expenses ({format(currentMonthStart, "MMMM yyyy")})
        </Text>
        <BarChart
          data={monthlyData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero={true}
          showValuesOnTopOfBars={true}
          withVerticalLabels={true}
          withHorizontalLabels={false}
        />
        <Text style={styles.totalExpense}>Total Expense: {totalExpense}</Text>
        <PieChart
          data={categoryData}
          width={screenWidth - 20}
          height={220}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          center={[5, 0]}
          absolute
        />
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <Header heading="Expense Tracker" />
        <FlatList
          data={currentMonthTransactions}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
        />
      </View>
      <Footer navigation={navigation} />
    </>
  );
};

const processMonthlyData = (transactions) => {
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const weeks = eachWeekOfInterval(
    { start: currentMonthStart, end: currentMonthEnd },
    { weekStartsOn: 1 }
  );

  const labels = weeks.map((_, i) => `Week ${i + 1}`);
  const data = Array(weeks.length).fill(0);

  transactions.forEach((transaction) => {
    const date = parseISO(transaction.transaction_date);
    const weekIndex = getWeekOfMonth(date, { weekStartsOn: 1 }) - 1;
    data[weekIndex] += transaction.amount;
  });

  return {
    labels,
    datasets: [
      {
        data,
      },
    ],
  };
};

const processCategoryData = (transactions) => {
  const categories = ["Food", "Grocery", "Shopping", "Bills", "Debt", "Others"];
  const data = categories.map((category) => {
    const total = transactions
      .filter((transaction) => transaction.category === category)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return {
      name: category,
      amount: total,
      color: getColorForCategory(category),
      legendFontColor: "#7F7F7F",
      legendFontSize: 15,
    };
  });
  return data.filter((item) => item.amount > 0);
};

const getColorForCategory = (category) => {
  const colors = {
    Food: "#f54242",
    Grocery: "#f5a142",
    Shopping: "#f5d142",
    Bills: "#42f54b",
    Debt: "#4287f5",
    Others: "#9b42f5",
  };
  return colors[category] || "#000";
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1E6F9",
  },
  scrollContainer: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 10,
    color: "#555555",
  },
  chart: {
    marginVertical: 10,
    borderRadius: 16,
    padding: 5,
    paddingRight: 0,
  },
  totalExpense: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 10,
    paddingTop: 10,
    color: "#555555",
  },
  pieChartContainer: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    width: screenWidth - 40,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  picker: {
    width: screenWidth - 40,
    marginVertical: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pickerItem: {
    color: "#000",
  },
  transactionItem: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 30,
  },
  transactionDetails: {
    flexDirection: "column",
  },
  merchant: {
    fontSize: 16,
    fontWeight: "bold",
  },
  category: {
    fontSize: 14,
    color: "#666",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  credit: {
    color: "green",
  },
  debit: {
    color: "red",
  },
  navigation: {
    paddingRight: 20,
  },
  transactionList: {
    marginRight: 20,
  },
});

export default MonthlyChart;
