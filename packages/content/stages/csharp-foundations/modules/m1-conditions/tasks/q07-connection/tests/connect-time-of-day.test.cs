public class ConnectTimeOfDayTests
{
    [Theory(DisplayName = "接続練習")]
    [InlineData(5, "morning")]
    [InlineData(11, "morning")]
    [InlineData(12, "afternoon")]
    [InlineData(17, "afternoon")]
    [InlineData(4, "evening")]
    [InlineData(18, "evening")]
    [InlineData(0, "evening")]
    [InlineData(23, "evening")]
    public void ConnectTimeOfDay(int hour, string expected)
    {
        Assert.Equal(expected, Answers.ConnectTimeOfDay(hour));
    }
}
