const visualizeContributions = async () => {
    const username = document.getElementById("username").value;
    const days = Math.min(
      365,
      Math.max(1, parseInt(document.getElementById("days").value))
    );
    const loadingElement = document.getElementById("loading");
    const errorElement = document.getElementById("error");
    const graphContainer = document.getElementById("contributionGraph");

    loadingElement.style.display = "block";
    errorElement.style.display = "none";
    errorElement.textContent = "";
    graphContainer.innerHTML = "";

    try {
      const contributionData = await fetchGitHubContributions(
        username,
        days
      );
      renderContributionGraph(contributionData);
    } catch (error) {
      console.error("Error fetching contribution data:", error);
      errorElement.textContent =
        "Error fetching contribution data. Please check the username and try again.";
      errorElement.style.display = "block";
    } finally {
      loadingElement.style.display = "none";
    }
  };

  const fetchGitHubContributions = async (username, days) => {
    const token = "******************";
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);

    const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            date
                            contributionCount
                        }
                    }
                }
            }
        }
    }
`;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          username,
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const contributions = {};
    data.data.user.contributionsCollection.contributionCalendar.weeks.forEach(
      (week) => {
        week.contributionDays.forEach((day) => {
          contributions[day.date] = day.contributionCount;
        });
      }
    );

    return contributions;
  };

  const renderContributionGraph = (data) => {
    const graphContainer = document.getElementById("contributionGraph");
    graphContainer.innerHTML = "";

    const sortedDates = Object.keys(data).sort();
    const maxContributions = Math.max(...Object.values(data));

    let currentMonth = null;
    let monthContainer = null;
    let daysContainer = null;

    sortedDates.forEach((date, index) => {
      const [year, month, day] = date.split("-");
      const monthYear = `${year}-${month}`;

      if (monthYear !== currentMonth) {
        if (currentMonth !== null) {
          // Fill the remaining days of the previous month with empty boxes
          const daysInWeek = 7;
          const remainingDays = daysInWeek - (index % daysInWeek);
          for (let i = 0; i < remainingDays; i++) {
            const emptyDay = document.createElement("div");
            emptyDay.className = "day";
            emptyDay.style.backgroundColor = "#161b22";
            daysContainer.appendChild(emptyDay);
          }
        }

        currentMonth = monthYear;
        monthContainer = document.createElement("div");
        monthContainer.className = "month";

        const monthLabel = document.createElement("div");
        monthLabel.className = "month-label";
        monthLabel.textContent = new Date(year, month - 1).toLocaleString(
          "default",
          { month: "short" }
        );

        daysContainer = document.createElement("div");
        daysContainer.className = "days";

        monthContainer.appendChild(monthLabel);
        monthContainer.appendChild(daysContainer);
        graphContainer.appendChild(monthContainer);
      }

      const contributions = data[date];
      const dayElement = document.createElement("div");
      dayElement.className = "day";
      dayElement.style.backgroundColor = getColor(
        contributions,
        maxContributions
      );
      dayElement.setAttribute("data-date", date);
      dayElement.setAttribute("data-contributions", contributions);

      dayElement.addEventListener("mouseover", showTooltip);
      dayElement.addEventListener("mouseout", hideTooltip);

      daysContainer.appendChild(dayElement);
    });
  };

  const getColor = (contributions) => {
    if (contributions === 0) return "#161b22";
    const levels = [
      [0, 0, 0],
      [9, 68, 40], // Adjusted for 1 contribution
      [22, 108, 67],
      [44, 138, 78],
      [57, 173, 86],
      [77, 217, 100],
    ];

    let intensity;
    if (contributions === 1) {
      intensity = 1;
    } else if (contributions < 4) {
      intensity = 2;
    } else if (contributions < 8) {
      intensity = 3;
    } else if (contributions < 12) {
      intensity = 4;
    } else {
      intensity = 5;
    }

    return `rgb(${levels[intensity][0]}, ${levels[intensity][1]}, ${levels[intensity][2]})`;
  };

  const showTooltip = (event) => {
    const tooltip = document.getElementById("tooltip");
    const date = event.target.getAttribute("data-date");
    const contributions = event.target.getAttribute("data-contributions");

    tooltip.textContent = `${date}: ${contributions} contribution${
      contributions !== "1" ? "s" : ""
    }`;
    tooltip.style.display = "block";
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
  };

  const hideTooltip = () => {
    document.getElementById("tooltip").style.display = "none";
  };