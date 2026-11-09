public class Q08IsLengthAtLeastTests
{
    [Fact(DisplayName = "Q08 長さが N 以上か")]
    public void Q08IsLengthAtLeast()
    {
        Assert.Equal(true, Answers.Q08IsLengthAtLeast("abc", 3));
        Assert.Equal(false, Answers.Q08IsLengthAtLeast("ab", 3));
        Assert.Equal(false, Answers.Q08IsLengthAtLeast("", 1));
        Assert.Equal(true, Answers.Q08IsLengthAtLeast("", 0));
    }
}
