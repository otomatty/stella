public class CheckAHourlyFeeTests
{
    [Theory(DisplayName = "確認A")]
    [InlineData(3, 330)]
    [InlineData(0, 0)]
    [InlineData(2, 240)]
    [InlineData(4, 420)]
    [InlineData(1, 120)]
    [InlineData(20, 1860)]
    public void CheckAHourlyFee(int hours, int expected)
    {
        Assert.Equal(expected, Answers.CheckAHourlyFee(hours));
    }
}
