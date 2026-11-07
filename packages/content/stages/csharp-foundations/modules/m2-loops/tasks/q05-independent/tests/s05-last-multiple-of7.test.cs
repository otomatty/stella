public class S05LastMultipleOf7Tests
{
    [Theory(DisplayName = "S05 最後の対象")]
    [InlineData(20, 14)]
    [InlineData(6, 0)]
    [InlineData(0, 0)]
    [InlineData(7, 7)]
    [InlineData(100, 98)]
    public void S05LastMultipleOf7(int n, int expected)
    {
        Assert.Equal(expected, Answers.S05LastMultipleOf7(n));
    }
}
