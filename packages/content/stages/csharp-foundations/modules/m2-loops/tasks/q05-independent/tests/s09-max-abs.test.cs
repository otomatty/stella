public class S09MaxAbsTests
{
    [Theory(DisplayName = "S09 3地点からの距離")]
    [InlineData(-8, 3, 4, 8)]
    [InlineData(0, 0, 0, 0)]
    [InlineData(100, -100, 0, 100)]
    [InlineData(-1, -2, -3, 3)]
    [InlineData(5, 5, 5, 5)]
    public void S09MaxAbs(int a, int b, int c, int expected)
    {
        Assert.Equal(expected, Answers.S09MaxAbs(a, b, c));
    }
}
