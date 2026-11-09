public class Q23SeasonTests
{
    [Theory(DisplayName = "Q23 月の季節")]
    [InlineData(3, "spring")]
    [InlineData(5, "spring")]
    [InlineData(8, "summer")]
    [InlineData(12, "winter")]
    [InlineData(1, "winter")]
    [InlineData(2, "winter")]
    [InlineData(6, "summer")]
    [InlineData(9, "autumn")]
    [InlineData(11, "autumn")]
    public void Q23Season(int month, string expected)
    {
        Assert.Equal(expected, Answers.Q23Season(month));
    }
}
