public class S06NearTests
{
    [Theory(DisplayName = "S06 距離と上限")]
    [InlineData(8, 3, 5, "near")]
    [InlineData(3, 8, 4, "far")]
    [InlineData(3, 8, 5, "near")]
    [InlineData(5, 5, 0, "near")]
    [InlineData(-100, 100, 100, "far")]
    [InlineData(-3, 4, 7, "near")]
    public void S06Near(int a, int b, int k, string expected)
    {
        Assert.Equal(expected, Answers.S06Near(a, b, k));
    }
}
