public class Q27MonthOfTests
{
    [Fact(DisplayName = "Q27 月")]
    public void Q27MonthOf()
    {
        Assert.Equal("09", Answers.Q27MonthOf("20260903"));
        Assert.Equal("12", Answers.Q27MonthOf("20261231"));
    }
}
