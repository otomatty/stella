public class S10NextHourTests
{
    [Theory(DisplayName = "S10 翌日の時刻")]
    [InlineData(22, 3, 1)]
    [InlineData(0, 0, 0)]
    [InlineData(10, 5, 15)]
    [InlineData(23, 1, 0)]
    [InlineData(1, 23, 0)]
    [InlineData(23, 23, 22)]
    public void S10NextHour(int hour, int add, int expected)
    {
        Assert.Equal(expected, Answers.S10NextHour(hour, add));
    }
}
