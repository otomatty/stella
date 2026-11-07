public class Q09LeapYearTests
{
    [Theory(DisplayName = "Q09 4で割り切れるか")]
    [InlineData(2024, "leap")]
    [InlineData(2023, "common")]
    [InlineData(2000, "leap")]
    public void Q09LeapYear(int year, string expected)
    {
        Assert.Equal(expected, Answers.Q09LeapYear(year));
    }
}
