public class Q20WaterStateTests
{
    [Theory(DisplayName = "Q20 水の状態")]
    [InlineData(-1, "ice")]
    [InlineData(0, "water")]
    [InlineData(100, "water")]
    [InlineData(101, "steam")]
    public void Q20WaterState(int t, string expected)
    {
        Assert.Equal(expected, Answers.Q20WaterState(t));
    }
}
